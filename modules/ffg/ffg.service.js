const moment = require('moment-timezone');
const { Tickets, State, Deliveries, FfgGroups } = require('./ffg.models');
const { Groups } = require('../../models/group');
const { active, normalize, sla, dayRange } = require('./ffg.logic');
const { buildExcel } = require('./ffg.excel');
const { activeMessages } = require('./ffg.formatter');
const normalizeBranch = value => normalize(value).replace(/^(AREA|BRANCH)\s+/, '').trim();

function messages(area, tickets, mode, now) {
  if (mode !== 'hourly') return activeMessages(area, tickets, now);
  const header = `FFG ${mode === 'hourly' ? 'REKAP HARI INI' : 'OPEN + SLA'}\n${area}\n` +
    moment(now).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm [WIB]') + `\nTotal: ${tickets.length}\n`;
  const chunks = []; let chunk = header;
  for (const ticket of tickets) {
    const value = sla(ticket, now);
    const line = `\n${ticket.incident} | ${ticket.service_no}\n` +
      `${String(ticket.customer_name || '-').slice(0, 120)} | ${ticket.workzone}\n` +
      `Status: ${ticket.status}\nSLA: ${value.label}` +
      (value.target ? ` | ${value.target} jam | sisa ${value.remaining.toFixed(2)} jam` : '') + '\n';
    if (chunk.length + line.length > 3800) { chunks.push(chunk); chunk = header; }
    chunk += line;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

async function runFfg(mode, now = new Date(), runtime = {}) {
  const sync = await State.findById('sync').lean();
  const maxAge = Number(process.env.FFG_MAX_SYNC_AGE_SECONDS || 600) * 1000;
  if (!sync?.completed_at || now - sync.completed_at > maxAge) {
    console.warn('FFG report skipped: source synchronization is not fresh'); return;
  }
  const range = dayRange(now);
  const query = mode === 'hourly' ? { reported_at: { $gte: range.start, $lt: range.end } } : {};
  let tickets = await Tickets.find(query).sort({ reported_at: 1, incident: 1 }).lean();
  // Per-document freshness also protects missing incidents and partial scans.
  tickets = tickets.filter(t => !t.sync_error && t.synced_at &&
    // CLOSE snapshots are final and remain eligible for the hourly report.
    ((mode === 'hourly' && t.status_validasi === 'CLOSE') || now - t.synced_at <= maxAge) &&
    (mode === 'hourly' || (t.status_validasi === 'OPEN' && active(t))));
  const groups = await FfgGroups.find({ STATUS: 'ACTIVE' }).lean();
  const mapping = await Groups.find({}).lean();
  const workzones = new Map(mapping.map(g => [normalize(g.WORKZONE), g]));
  const unmapped = tickets.filter(t => !workzones.get(t.workzone)?.BRANCH);
  if (unmapped.length) console.warn(`FFG: ${unmapped.length} tickets have no branch mapping`);
  const slot = moment(now).tz('Asia/Jakarta').startOf('hour');
  if (mode !== 'hourly') slot.minute(Math.floor(moment(now).minute() / 15) * 15);
  const getBotByZone = runtime.getBotByZone || require('../../core/globalSender').getBotByZone;
  for (const group of groups) {
    const area = normalizeBranch(group.BRANCH);
    if (!area) continue;
    const list = tickets.filter(t => normalizeBranch(workzones.get(t.workzone)?.BRANCH) === area)
      .map(t => ({ ...t, HSA: normalize(workzones.get(t.workzone)?.SERVICE_AREA) }));
    if (!list.length) continue;
    const zone = mapping.find(g => normalizeBranch(g.BRANCH) === area)?.ZONEBOT;
    if (!zone) { console.warn(`FFG: no bot mapping for ${area}`); continue; }
    const key = `${mode}:${slot.toISOString()}:${group.ID_GRUP}:${group.ID_TOPIC_GRUP || ''}:${area}`;
    // Build attachments before claiming delivery, so generation errors can be retried.
    const excel = mode === 'hourly' ? await buildExcel(list, now) : null;
    try { await Deliveries.create({ _id: key, status: 'SENDING', started_at: new Date() }); }
    catch (error) { if (error.code === 11000) continue; throw error; }
    try {
      const bot = await getBotByZone(zone);
      const options = group.ID_TOPIC_GRUP ? { message_thread_id: Number(group.ID_TOPIC_GRUP) } : {};
      // Use the same bot/area routing as TTR. Its text sender swallows errors,
      // so FFG calls Telegram directly to record uncertain delivery accurately.
      for (const message of messages(area, list, mode, now)) {
        await bot.telegram.sendMessage(group.ID_GRUP, message, options);
      }
      if (excel) await bot.telegram.sendDocument(group.ID_GRUP,
        { source: excel, filename: `FFG-${area.replace(/[^A-Z0-9_-]/g, '_')}-${slot.format('YYYYMMDD-HHmm')}.xlsx` }, options);
      await Deliveries.updateOne({ _id: key }, { $set: { status: 'SENT', completed_at: new Date() } });
    } catch (error) {
      await Deliveries.updateOne({ _id: key }, { $set: { status: 'UNKNOWN',
        last_error: 'Delivery may be partial; inspect Telegram before retry' } });
      console.warn(`FFG delivery uncertain for ${area}`);
    }
  }
}
module.exports = { runFfg, messages, normalizeBranch };
