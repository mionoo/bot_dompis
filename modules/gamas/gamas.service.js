const Groups = require('./gamas.model');
const { SegmentTickets } = require('../../models/dompis');
const { TYPES, buildGamasMessages, yamlChunks } = require('./gamas.formatter');
async function runGamas() {
  const groups = await Groups.find({ STATUS: 'ACTIVE' }).lean();
  if (!groups.length) return;
  const tickets = await SegmentTickets.find({ jenis_tiket: { $in: TYPES } }).lean();
  const messages = buildGamasMessages(tickets);
  const bots = Object.values(require('../../core/telegramInstance'));
  const { delay } = require('../../core/globalSender');
  for (const group of groups) {
    const bot = bots.find(b => String(b.botInfo?.id || b.token?.split(':')[0]) === group.BOT_ID);
    if (!bot) { console.error(`❌ GAMAS: bot tidak ditemukan untuk grup ${group.ID_GRUP}`); continue; }
    try {
      for (const message of messages) {
        for (const chunk of yamlChunks(message)) {
          for (let attempt = 0; ; attempt++) {
            try {
              await bot.telegram.sendMessage(group.ID_GRUP, chunk, {
                parse_mode: 'HTML',
                ...(group.ID_TOPIC_GRUP && { message_thread_id: Number(group.ID_TOPIC_GRUP) }),
              });
              break;
            } catch (err) {
              const retry = err.response?.parameters?.retry_after;
              if (!retry || attempt >= 3) throw err;
              await delay((retry + 1) * 1000);
            }
          }
          await delay(1100);
        }
      }
      console.log(`✅ GAMAS terkirim ke ${group.ID_GRUP}`);
    } catch (err) {
      console.error(`❌ GAMAS gagal ke ${group.ID_GRUP}:`, err.message);
    }
  }
}
module.exports = { runGamas };
