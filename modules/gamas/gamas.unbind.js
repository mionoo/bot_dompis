async function unbindGamasGroup(ctx, dependencies = {}) {
  if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
    return ctx.reply('⚠️ Jalankan /hapusgamas di grup atau topik GAMAS yang ingin dilepas binding-nya.');
  }
  if ((ctx.message?.text || '').trim().split(/\s+/).length !== 1) {
    return ctx.reply('Gunakan /hapusgamas tanpa tambahan. Hanya binding GAMAS di grup/topik ini yang dihapus.');
  }
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    if (!['creator', 'administrator'].includes(member.status)) {
      return ctx.reply('⚠️ Hanya admin grup yang dapat menghapus binding GAMAS.');
    }
    const Groups = dependencies.Groups || require('./gamas.model');
    const topic = ctx.message?.message_thread_id;
    const result = await Groups.deleteMany({
      ID_GRUP: String(ctx.chat.id),
      ID_TOPIC_GRUP: topic ? String(topic) : { $in: [null, '', '0'] },
    });
    if (!result.deletedCount) return ctx.reply('ℹ️ Binding GAMAS tidak ditemukan di grup/topik ini.');
    return ctx.reply(`✅ Binding GAMAS dihapus (${result.deletedCount} data).\nID Grup: ${ctx.chat.id}\nTopic: ${topic || '-'}\nGunakan /setgamas untuk mendaftarkan kembali.`);
  } catch (err) {
    console.error('❌ Gagal menghapus binding GAMAS:', err.name);
    return ctx.reply('❌ Gagal menghapus binding GAMAS. Periksa koneksi database dan izin bot, lalu coba lagi.');
  }
}
module.exports = { unbindGamasGroup };
