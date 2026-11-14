const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
const { Groups } = require('../../models/group');
const { SegmentTickets } = require('../../models/dompis');
const { Nakers } = require('../../models/users');
const { normalize, sla, snapshot, sourceDate } = require('../ffg/ffg.logic');
const { SEGMENT_PRIORITY } = require('../branch/branch.data');
const { remainingTime } = require('../ffg/ffg.formatter');

const loose = collection => new mongoose.Schema({ _id: String }, { collection, strict: false });
const Tickets = mongoose.model('GaulTicket', loose('gaul_tickets'));
const Deliveries = mongoose.model('GaulDelivery', loose('gaul_deliveries'));
const binding = new mongoose.Schema({ BRANCH: String, ID_GRUP: String, ID_TOPIC_GRUP: String,
  STATUS: String }, { collection: 'gaul_groups', bufferCommands: false });
binding.index({ BRANCH: 1, ID_GRUP: 1, ID_TOPIC_GRUP: 1 }, { unique: true });
const GaulGroups = mongoose.model('GaulGroup', binding);
const branchName = value => normalize(value).replace(/^(BRANCH|AREA)\s+/, '');
const level = /^\s*(?:korlap|osa|hsa|officer\s+3)\s*$/i;
const escape = value => String(value ?? '-').slice(0, 120).replace(/&/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dateText = value => {
  const date = sourceDate(value);
  return date ? moment(date).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm [WIB]') : '-';
};

async function fetchCurrent(ids) {
  const setting = key => process.env['GAUL_MYSQL_' + key] || process.env['FFG_MYSQL_' + key];
  const connection = await mysql.createConnection({
    host: setting('HOST'), port: Number(setting('PORT') || 3306), user: setting('USER'),
    password: setting('PASSWORD'), database: setting('DATABASE'), dateStrings: true, connectTimeout: 10000,
  });
  try {
    const result = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const [rows] = await connection.execute({
        sql: 'SELECT incident, service_no, status, status_date, resolve_date, reported_date, source_ticket, customer_type, customer_segment, service_type, summary, workzone FROM piloting_tickets WHERE incident IN (' +
          chunk.map(() => '?').join(',') + ')', timeout: 15000,
      }, chunk);
      result.push(...rows);
    }
    return result;
  } finally { connection.destroy(); }
}

function prepareReminder(tracked, current, segment, group) {
  if (!current || !normalize(current.status) || normalize(current.status) === 'CLOSED' ||
      typeof current.service_no !== 'string') return null;
  const area = normalize(group?.SERVICE_AREA || segment?.SERVICE_AREA);
  const branch = branchName(group?.BRANCH || segment?.BRANCH);
  if (!area || !branch) return null;
  return { tracked, current, area, branch, zone: group?.ZONEBOT };
}

function reminderMessages(branch, reminders, nakers, now) {
  const sections = new Map();
  for (const reminder of reminders) {
    if (!sections.has(reminder.area)) sections.set(reminder.area, []);
    sections.get(reminder.area).push(reminder);
  }
  const title = '🔁 <b>PENGINGAT TIKET GAUL</b>\n🏢 Branch: ' + escape(branch) + '\n';
  const result = [];
  let chunk = title;
  const append = (block, continuation = '') => {
    if (chunk.length + block.length > 3800) {
      result.push(chunk);
      chunk = title + continuation;
    }
    chunk += block;
  };
  const icons = { SAFE: '🟢', WARNING: '🟡', CRITICAL: '🟠', 'OVER SLA': '🔴' };
  for (const [area, list] of sections) {
    const heading = '\n📍 <b>' + escape(area) + '</b>\n';
    append((chunk === title ? '' : '\n━━━━━━━━━━━━━━━━━━\n') + heading);
    const ids = new Set();
    let hasPic = false;
    for (const naker of nakers) {
      const id = String(naker.ID_TELEGRAM || '').trim();
      if (!level.test(naker.LEVEL) || normalize(naker.SERVICE_AREA) !== area ||
          (naker.BRANCH && branchName(naker.BRANCH) !== branch)) continue;
      const validId = /^\d{1,20}$/.test(id);
      const key = validId ? id : 'name:' + normalize(naker.NAMA);
      if (ids.has(key)) continue;
      ids.add(key);
      hasPic = true;
      const name = escape(naker.NAMA || 'PIC');
      const tag = validId ? '<a href="tg://user?id=' + id + '">' + name + '</a>' : name + ' (belum binding Telegram)';
      append('👥 PIC: ' + tag + '\n', heading);
    }
    if (!hasPic) append('👥 PIC: Belum ditemukan\n', heading);
    const types = new Map();
    for (const reminder of list) {
      const analysis = sla(snapshot(reminder.current), now);
      const key = JSON.stringify([analysis.segment, analysis.target]);
      if (!types.has(key)) types.set(key, []);
      types.get(key).push({ ...reminder, analysis });
    }
    const priority = type => SEGMENT_PRIORITY[type[0].analysis.segment] || 99;
    for (const type of [...types.values()].sort((a, b) => priority(a) - priority(b) ||
      a[0].analysis.segment.localeCompare(b[0].analysis.segment))) {
      const { segment, target } = type[0].analysis;
      const label = '\n📌 <b>' + escape(segment) + '</b> (' + type.length + ' tiket' +
        (Number.isFinite(target) ? ' | SLA ' + target + 'H' : '') + ')\n';
      let prefix = label;
      for (const { tracked, current, analysis } of type.sort((a, b) =>
        (a.analysis.remaining ?? Infinity) - (b.analysis.remaining ?? Infinity))) {
        const block = (icons[analysis.label] || '⚪') + ' <b>' + escape(current.incident) + '</b> — ' +
          escape(current.status) + ' | Sisa: <b>' + (Number.isFinite(analysis.remaining)
            ? remainingTime(analysis.remaining) : '-') + '</b> | ' + escape(current.workzone) +
          '\n   No. layanan: ' + escape(tracked.service_no) +
          '\n   Reported Date: ' + dateText(current.reported_date) +
          '\n   ↩️ ' + escape(tracked.previous_incident) + ' — CLOSED' +
          '\n      Reported Date: ' + dateText(tracked.previous_reported_date) + '\n';
        append(prefix + block, heading + (prefix ? '' : label));
        prefix = '';
      }
    }
  }
  if (chunk !== title) result.push(chunk);
  return result;
}

async function runGaul(scheduledAt = new Date(), options = {}) {
  const tracked = await Tickets.find({ closed: false }).lean();
  if (!tracked.length) return { sent: 0, failed: 0 };
  const ids = tracked.map(t => t.incident);
  const current = new Map((await (options.fetchCurrent || fetchCurrent)(ids)).map(t => [t.incident, t]));
  const closed = tracked.filter(t => normalize(current.get(t.incident)?.status) === 'CLOSED').map(t => t._id);
  if (closed.length) await Tickets.updateMany({ _id: { $in: closed } }, { $set: { closed: true, closed_checked_at: new Date() } });
  const bindings = await GaulGroups.find({ STATUS: 'ACTIVE' }).lean();
  if (!bindings.length) return { sent: 0, failed: 0 };
  const segments = new Map((await SegmentTickets.find({ incident: { $in: ids } }).lean()).map(t => [t.incident, t]));
  const groups = await Groups.find({}).lean();
  const byWorkzone = new Map(groups.map(g => [normalize(g.WORKZONE), g]));
  const reminders = tracked.map(t => {
    const row = current.get(t.incident);
    return prepareReminder(t, row, segments.get(t.incident), byWorkzone.get(normalize(row?.workzone)));
  }).filter(Boolean);
  const nakers = await Nakers.find({ LEVEL: level }).select('NAMA ID_TELEGRAM SERVICE_AREA BRANCH LEVEL').lean();
  let sent = 0, failed = 0;
  for (const binding of bindings) {
    const branch = branchName(binding.BRANCH);
    const list = reminders.filter(t => t.branch === branch);
    const zone = list.find(t => t.zone)?.zone || groups.find(g => branchName(g.BRANCH) === branch && g.ZONEBOT)?.ZONEBOT;
    if (!list.length || !zone) continue;
    const slot = options.requestId || moment(scheduledAt).startOf('hour').toISOString();
    const key = JSON.stringify([slot, branch, binding.ID_GRUP, binding.ID_TOPIC_GRUP]);
    try { await Deliveries.create({ _id: key, status: 'SENDING', started_at: new Date() }); }
    catch (error) { if (error.code === 11000) continue; throw error; }
    try {
      const bot = await (options.getBotByZone || require('../../core/globalSender').getBotByZone)(zone);
      for (const message of reminderMessages(branch, list, nakers, new Date())) {
        await bot.telegram.sendMessage(binding.ID_GRUP, message, { parse_mode: 'HTML',
          ...(binding.ID_TOPIC_GRUP ? { message_thread_id: Number(binding.ID_TOPIC_GRUP) } : {}) });
      }
      await Deliveries.updateOne({ _id: key }, { $set: { status: 'SENT' } });
      sent++;
    } catch (_) {
      failed++;
      console.warn('GAUL kiriman tidak terkonfirmasi | ' + branch);
      await Deliveries.updateOne({ _id: key }, { $set: { status: 'UNKNOWN' } }).catch(() => {});
    }
  }
  console.log('GAUL | terverifikasi: ' + current.size + ' | CLOSED: ' + closed.length + ' | tujuan terkirim: ' + sent);
  return { sent, failed };
}
module.exports = { runGaul, GaulGroups, prepareReminder, reminderMessages };
