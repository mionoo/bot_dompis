const { findBranch } = require('../branch/branch.data');
const { reportQueue } = require('../../core/reportQueue');
const { GaulGroups, runGaul } = require('./gaul.service');

async function bindGaul(ctx, branch, model = GaulGroups) {
  if (!['group', 'supergroup'].includes(ctx.chat.type)) return ctx.reply('Binding GAUL hanya di grup atau topik tujuan.');
  if (!findBranch(branch)) return ctx.reply('Branch tidak terdaftar. Contoh: /gaul_SURABAYA@NamaBot');
  const filter = { BRANCH: branch, ID_GRUP: String(ctx.chat.id),
    ID_TOPIC_GRUP: ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null };
  const unavailable = 'MongoDB bot belum terhubung. Binding GAUL belum tersimpan; periksa koneksi bot25 lalu coba lagi.';
  if (model.db.readyState !== 1) return ctx.reply(unavailable);
  try {
    await model.updateOne(filter, { $set: { STATUS: 'ACTIVE' } }, { upsert: true });
  } catch (error) {
    console.warn('Binding GAUL gagal | MongoDB | ' + (Number.isInteger(error.code) ? error.code : 'WRITE_FAILED'));
    if (model.db.readyState !== 1) return ctx.reply(unavailable);
    return ctx.reply('Binding GAUL gagal disimpan. Periksa akses tulis MongoDB bot25.');
  }
  return ctx.reply('✅ Grup GAUL aktif untuk ' + branch);
}

async function testGaul(ctx) {
  if (ctx.chat.type !== 'private') return ctx.reply('Gunakan /tesgaul lewat japri.');
  const now = new Date();
  const requestId = 'manual:' + [ctx.botInfo?.id, ctx.chat.id, ctx.message.message_id].join(':');
  await ctx.reply('Tes GAUL masuk antrean dan akan dikirim ke binding GAUL aktif.');
  void reportQueue.enqueue(requestId, 'Tes GAUL', async () => {
    try {
      const result = await runGaul(now, { requestId });
      await ctx.reply('Tes GAUL selesai. Berhasil: ' + result.sent + '; tidak pasti: ' + result.failed);
    } catch (_) { await ctx.reply('Tes GAUL gagal. Periksa log bot.'); }
  }).catch(() => console.warn('Balasan tes GAUL gagal'));
}
module.exports = { bindGaul, testGaul };
