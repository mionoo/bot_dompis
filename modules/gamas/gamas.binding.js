const Groups = require('./gamas.model');
async function bindGamasGroup(ctx) {
  if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
    return ctx.reply('⚠️ Gunakan /setgamas di grup atau topik khusus GAMAS.');
  }
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (!['creator', 'administrator'].includes(member.status)) {
    return ctx.reply('⚠️ Hanya admin grup yang dapat mendaftarkan grup GAMAS.');
  }
  await Groups.findOneAndUpdate({
    ID_GRUP: String(ctx.chat.id),
    ID_TOPIC_GRUP: ctx.message?.message_thread_id ? String(ctx.message.message_thread_id) : null,
  }, { $set: {
    NAMA_GRUP: ctx.chat.title || '-',
    BOT_ID: String(ctx.botInfo.id),
    STATUS: 'ACTIVE',
  } }, { upsert: true, new: true });
  return ctx.reply('✅ Grup GAMAS terdaftar. Laporan seluruh AREA 3 dikirim tiap 15 menit pukul 08.00–21.45 dan tiap jam pukul 22.00–07.00 WIB.');
}
module.exports = { bindGamasGroup };
