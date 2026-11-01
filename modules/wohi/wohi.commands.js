const { findBranch } = require('../branch/branch.data');
const { reportQueue } = require('../../core/reportQueue');
const { WohiGroups } = require('./wohi.models');
const { runWohi } = require('./wohi.service');
async function bindWohi(ctx, model = WohiGroups) {
  if (!['group', 'supergroup'].includes(ctx.chat.type)) return ctx.reply('Binding WO HI hanya di grup/topik tujuan.');
  const branch = String(ctx.message.text).replace(/^\/wohi_/i, '')
    .replace(/@[A-Za-z0-9_]+(?=\s|$)/, '').trim().toUpperCase();
  if (!branch || !findBranch(branch)) return ctx.reply('Branch tidak terdaftar. Contoh: /wohi_SURABAYA');
  const filter = { BRANCH: branch, ID_GRUP: String(ctx.chat.id),
    ID_TOPIC_GRUP: ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null };
  try {
    if (await model.findOne(filter).lean()) return ctx.reply('Binding WO HI sudah terdaftar.');
    await model.create({ ...filter, NAMA_GRUP: ctx.chat.title || '-', STATUS: 'ACTIVE' });
    return ctx.reply(`✅ Binding WO HI berhasil\nBranch: ${branch}\nGrup: ${ctx.chat.title || '-'}\nTopik: ${filter.ID_TOPIC_GRUP || '-'}`);
  } catch (_) { return ctx.reply('Binding WO HI gagal. Periksa log/database.'); }
}
let running = false;
async function testWohi(ctx, runner = runWohi) {
  if (ctx.chat.type !== 'private') return ctx.reply('Command /teswohi hanya lewat japri bot.');
  if (running) return ctx.reply('Tes WO HI masih mengantre atau berjalan.');
  running = true;
  const now = new Date();
  const requestId = `${ctx.botInfo?.id || ctx.me}:${ctx.chat.id}:${ctx.message.message_id}`;
  try { await ctx.reply('Tes WO HI masuk antrean. Ringkasan dan Excel dikirim ke seluruh binding WO HI ACTIVE.'); }
  catch (error) { running = false; throw error; }
  void reportQueue.enqueue(`manual:wohi:${requestId}`, 'Tes WO HI', async () => {
    const result = await runner(now, { trigger: 'manual', requestId });
    if (result.reason === 'NO_BINDINGS') return ctx.reply('Belum ada binding WO HI ACTIVE. Daftarkan /wohi_<BRANCH> di grup tujuan.');
    return ctx.reply(`Tes WO HI selesai.\nBerhasil: ${result.sent}\nGagal/tidak pasti: ${result.failed}\n` +
      `Dilewati: ${result.skipped}\nTiket tanpa pemetaan branch: ${result.unmapped || 0}`);
  }).catch(async () => {
    console.warn('Tes WO HI gagal; periksa konfigurasi atau koneksi sumber. Kredensial disembunyikan.');
    try { await ctx.reply('Tes WO HI gagal diproses. Periksa konfigurasi MySQL dan log bot.'); } catch (_) {}
  }).finally(() => { running = false; });
}
module.exports = { bindWohi, testWohi };
