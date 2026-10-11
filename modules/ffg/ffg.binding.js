const { findBranch } = require('../branch/branch.data');
const { FfgGroups } = require('./ffg.models');
async function bindFfgGroup(ctx, model = FfgGroups) {
  if (!['group', 'supergroup'].includes(ctx.chat.type))
    return ctx.reply('⚠️ Command ini hanya bisa digunakan di grup.');
  const branch = String(ctx.message?.text || '').replace(/^\/ffg_/i, '')
    .replace(/@[A-Za-z0-9_]+(?=\s|$)/, '').trim().toUpperCase();
  if (!branch) return ctx.reply('⚠️ Contoh command: /ffg_SURABAYA');
  if (!findBranch(branch)) return ctx.reply(`❌ Branch ${branch} tidak terdaftar.`);
  const filter = { ID_GRUP: String(ctx.chat.id),
    ID_TOPIC_GRUP: ctx.message?.message_thread_id ? String(ctx.message.message_thread_id) : null,
    BRANCH: branch };
  try {
    const existing = await model.findOne(filter).lean();
    if (existing) return ctx.reply('⚠️ Binding FFG grup/topik dan branch ini sudah terdaftar. Hubungi admin untuk perubahan konfigurasi.');
    await model.create({ ...filter, NAMA_GRUP: ctx.chat.title || '-', STATUS: 'ACTIVE' });
    return ctx.reply(`✅ Grup FFG berhasil disimpan\nBranch: ${branch}\nGrup: ${ctx.chat.title || '-'}\n` +
      `ID grup: ${filter.ID_GRUP}\nTopik: ${filter.ID_TOPIC_GRUP || '-'}\nStatus: ACTIVE`);
  } catch (error) {
    if (error.code === 11000) return ctx.reply('⚠️ Binding FFG sudah terdaftar.');
    console.error('Penyimpanan binding FFG gagal (detail koneksi disembunyikan)');
    return ctx.reply('❌ Binding FFG gagal disimpan. Silakan coba kembali.');
  }
}
module.exports = { bindFfgGroup };
