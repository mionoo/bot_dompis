const { runFfg } = require('./ffg.service');
const running = new Set();
async function testFfg(ctx, mode, runner = runFfg) {
  if (ctx.chat.type !== 'private') return ctx.reply('Command tes FFG hanya melalui japri bot.');
  if (running.has(mode)) return ctx.reply('Tes laporan FFG ini masih berjalan. Tunggu sampai selesai.');
  running.add(mode);
  try {
    await ctx.reply('Tes FFG dimulai ke seluruh binding grup/topik ACTIVE, sesuai branch masing-masing.');
    const requestId = `${ctx.botInfo?.id || ctx.me}:${ctx.chat.id}:${ctx.message.message_id}`;
    const result = await runner(mode, new Date(), { trigger: 'manual', requestId });
    if (result.reason === 'STALE_SYNC') return ctx.reply('Tes dilewati: sinkronisasi FFG belum tersedia atau terlalu lama. Periksa ffg-sync.');
    if (result.reason === 'NO_BINDINGS') return ctx.reply('Belum ada binding grup FFG ACTIVE.');
    return ctx.reply(`Tes FFG selesai.\nBerhasil: ${result.sent} tujuan\nGagal/tidak pasti: ${result.failed} tujuan\n` +
      `Dilewati: ${result.skipped} tujuan (data kosong, pemetaan tidak tersedia, atau tes sudah diproses).`);
  } catch (error) {
    console.warn('Command tes FFG gagal; periksa log pengiriman tanpa kredensial.');
    return ctx.reply('Tes FFG gagal diproses. Periksa log bot dan ffg_deliveries.');
  } finally { running.delete(mode); }
}
module.exports = { testFfg };
