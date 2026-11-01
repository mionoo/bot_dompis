const moment = require('moment-timezone');
const { WohiGroups, WohiDeliveries } = require('./wohi.models');
const { Groups } = require('../../models/group');
const { createWohiSource } = require('./wohi.source');
const { prepareTickets, normalizeBranch, reportMessages } = require('./wohi.logic');
const { buildWohiExcel } = require('./wohi.excel');
function errorCode(error) {
  if (/^WOHI_[A-Z_]+$/.test(String(error?.message))) return error.message;
  const code = error?.response?.error_code ?? error?.code ?? error?.name;
  return /^[A-Za-z0-9_]{1,64}$/.test(String(code)) ? String(code) : 'ERROR';
}
async function runWohi(now = new Date(), runtime = {}) {
  const summary = { sent: 0, failed: 0, skipped: 0 };
  const bindings = await WohiGroups.find({ STATUS: 'ACTIVE' }).lean();
  if (!bindings.length) return { ...summary, reason: 'NO_BINDINGS' };
  let rows;
  try { rows = await (runtime.source || createWohiSource()).fetchToday(now); }
  catch (error) { console.warn(`WO HI gagal | baca MySQL | ${errorCode(error)}`); throw error; }
  const mapping = await Groups.find({}).lean();
  const tickets = prepareTickets(rows, mapping);
  const unmapped = tickets.filter(t => !t.WOHI_BRANCH).length;
  if (unmapped) console.warn(`WO HI: ${unmapped} tiket tidak memiliki pemetaan branch; periksa groups`);
  const slot = moment(now).tz('Asia/Jakarta').startOf('hour');
  for (const binding of bindings) {
    const branch = normalizeBranch(binding.BRANCH);
    const list = tickets.filter(ticket => ticket.WOHI_BRANCH === branch);
    if (!branch || !list.length) {
      summary.skipped++; console.log(`WO HI dilewati | ${branch || '-'} | tiket hari ini kosong`); continue;
    }
    const zone = mapping.find(g => normalizeBranch(g.BRANCH) === branch)?.ZONEBOT;
    if (!zone) { summary.skipped++; console.warn(`WO HI dilewati | ${branch} | ZONEBOT tidak tersedia`); continue; }
    const key = `${runtime.trigger === 'manual' ? `manual:${runtime.requestId}` : slot.toISOString()}:${branch}:${binding.ID_GRUP}:${binding.ID_TOPIC_GRUP || ''}`;
    try { await WohiDeliveries.create({ _id: key, status: 'SENDING', started_at: new Date(),
      trigger: runtime.trigger || 'schedule', branch, chat_id: binding.ID_GRUP,
      topic_id: binding.ID_TOPIC_GRUP, scheduled_at: now, ticket_count: list.length }); }
    catch (error) { if (error.code === 11000) { summary.skipped++; continue; } throw error; }
    let stage = 'buildExcel', sent = 0, attached = false;
    try {
      const excel = await buildWohiExcel(list);
      stage = 'resolveBot';
      const bot = await (runtime.getBotByZone || require('../../core/globalSender').getBotByZone)(zone);
      const options = binding.ID_TOPIC_GRUP ? { message_thread_id: Number(binding.ID_TOPIC_GRUP) } : {};
      for (const message of reportMessages(branch, list, now)) {
        stage = 'sendMessage'; await bot.telegram.sendMessage(binding.ID_GRUP, message, options); sent++;
      }
      stage = 'sendDocument';
      await bot.telegram.sendDocument(binding.ID_GRUP, { source: excel,
        filename: `WO-HI-${branch.replace(/[^A-Z0-9_-]/g, '_')}-${moment(now).tz('Asia/Jakarta').format('YYYYMMDD-HHmm')}.xlsx` }, options);
      attached = true; stage = 'saveStatus';
      await WohiDeliveries.updateOne({ _id: key }, { $set: { status: 'SENT', sent_messages: sent,
        attachment_sent: attached, completed_at: new Date() } });
      summary.sent++;
      console.log(`✅ WO HI terkirim | ${branch} | ${list.length} tiket | Excel | ${runtime.trigger || 'schedule'}`);
    } catch (error) {
      summary.failed++;
      console.warn(`WO HI gagal | ${branch} | ${stage} | ${errorCode(error)} | pesan ${sent} | Excel ${attached}`);
      try { await WohiDeliveries.updateOne({ _id: key }, { $set: { status: 'UNKNOWN',
        failed_stage: stage, error_code: errorCode(error), sent_messages: sent, attachment_sent: attached,
        last_error: 'Periksa Telegram sebelum mencoba ulang', failed_at: new Date() } }); }
      catch (_) { console.warn('Pencatatan kegagalan WO HI tidak berhasil'); }
    }
  }
  return { ...summary, unmapped };
}
module.exports = { runWohi };
