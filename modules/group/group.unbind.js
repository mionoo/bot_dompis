async function unbindGroup(ctx, dependencies = {}) {
  if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
    return ctx.reply('⚠️ Jalankan command ini di grup atau topik yang ingin dilepas binding-nya.');
  }
  const args = (ctx.message?.text || '').trim().split(/\s+/).slice(1);
  if (args.length) {
    return ctx.reply('Gunakan /hapusgrup tanpa tambahan. Binding ORDER/REPORT/KAWAL hanya di grup/topik ini yang dihapus.');
  }
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    if (!['creator', 'administrator'].includes(member.status)) {
      return ctx.reply('⚠️ Hanya admin grup yang dapat menghapus binding.');
    }
    const models = dependencies.models || require('../../models/idgrupTelegram');
    const topic = ctx.message?.message_thread_id;
    const query = {
      ID_GRUP: String(ctx.chat.id),
      ID_TOPIC_GRUP: topic ? String(topic) : { $in: [null, '', '0'] },
      TIPE_GRUP: { $in: ['ORDER', 'REPORT', 'KAWAL'] },
    };
    const normal = await models.Idgrups.deleteMany(query);
    const kawal = await models.idgrupKawal.deleteMany(query);
    const deletedCount = normal.deletedCount + kawal.deletedCount;
    const sessions = dependencies.sessions || require('../../core/groupSetupSession');
    const setup = sessions.getActiveGroupSetup(ctx);
    if (setup) sessions.finishGroupSetup(setup);
    if (!deletedCount) return ctx.reply('ℹ️ Binding ORDER/REPORT/KAWAL tidak ditemukan di grup/topik ini.');
    return ctx.reply(`✅ Binding ORDER/REPORT/KAWAL dihapus (${deletedCount} data).\nID Grup: ${ctx.chat.id}\nTopic: ${topic || '-'}\nGunakan /set untuk mendaftarkan kembali.`);
  } catch (err) {
    console.error('❌ Gagal menghapus binding grup:', err.name);
    return ctx.reply('❌ Gagal menghapus binding. Periksa koneksi database dan izin bot, lalu coba lagi.');
  }
}
module.exports = { unbindGroup };
