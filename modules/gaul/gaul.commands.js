const { findBranch } = require('../branch/branch.data');
const { reportQueue } = require('../../core/reportQueue');
const { GaulGroups, runGaul } = require('./gaul.service');

async function bindGaul(ctx, branch) {
  if (!['group', 'supergroup'].includes(ctx.chat.type)) return ctx.reply('Binding GAUL hanya di grup atau topik tujuan.');
  if (!findBranch(branch)) return ctx.reply('Branch tidak terdaftar. Contoh: /gaul_SURABAYA@NamaBot');
  const filter = { BRANCH: branch, ID_GRUP: String(ctx.chat.id),
    ID_TOPIC_GRUP: ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null };
  await GaulGroups.updateOne(filter, { $set: { STATUS: 'ACTIVE' } }, { upsert: true });
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
