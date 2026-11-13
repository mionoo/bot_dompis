const { Nakers } = require('../../models/users');
const { beginPrivateFlow, clearPrivateFlow } = require('../../core/privateFlowSession');

async function startEditNaker(ctx, args, model = Nakers) {
  if (ctx.chat?.type !== 'private') return ctx.reply('Gunakan /editnaker lewat japri bot.');
  if (args.length > 1 || (args.length && !/^\d+$/.test(args[0])))
    return ctx.reply('Gunakan /editnaker atau /editnaker <NIK milik Anda>.');

  const owner = String(ctx.from.id);
  const filter = { ID_TELEGRAM: owner, ...(args.length ? { NIK: args[0] } : {}) };
  const profiles = await model.find(filter).select('_id NIK NAMA').limit(2).lean();
  if (!profiles.length) return ctx.reply('Profil yang terhubung ke akun Telegram Anda tidak ditemukan. Lakukan binding dengan /start.');
  if (profiles.length > 1) return ctx.reply('Ada lebih dari satu profil yang cocok. Gunakan /editnaker <NIK milik Anda> atau hubungi admin.');

  const profile = profiles[0];
  beginPrivateFlow(ctx, { step: 'EDIT_NAKER_NAME', owner, profileId: String(profile._id),
    oldName: profile.NAMA ?? null });
  return ctx.reply('Nama saat ini: ' + (profile.NAMA || '-') + '\nKirim nama baru (2–80 karakter), atau /cancel.');
}

async function handleEditNaker(ctx, model = Nakers) {
  const session = ctx.session;
  const owner = String(ctx.from.id);
  if (ctx.chat?.type !== 'private' || session.owner !== owner) {
    clearPrivateFlow(ctx);
    return ctx.reply('Sesi edit tidak valid. Jalankan /editnaker lagi lewat japri.');
  }
  const text = String(ctx.message?.text || '').trim();
  if (session.step === 'EDIT_NAKER_NAME') {
    if (text.length < 2 || text.length > 80 || /[\x00-\x1f\x7f]/.test(text))
      return ctx.reply('Nama harus 2–80 karakter dalam satu baris. Coba lagi atau /cancel.');
    if (text === session.oldName) return ctx.reply('Nama masih sama. Kirim nama baru atau /cancel.');
    session.newName = text;
    session.step = 'EDIT_NAKER_CONFIRM';
    return ctx.reply('Nama lama: ' + (session.oldName || '-') + '\nNama baru: ' + text +
      '\nKetik SIMPAN untuk konfirmasi atau /cancel untuk batal.');
  }
  if (text.toUpperCase() !== 'SIMPAN') return ctx.reply('Ketik SIMPAN atau /cancel.');
  const result = await model.updateOne({ _id: session.profileId, ID_TELEGRAM: owner, NAMA: session.oldName },
    { $set: { NAMA: session.newName } }, { runValidators: true });
  clearPrivateFlow(ctx);
  return ctx.reply(result.matchedCount === 1 ? '✅ Nama profil berhasil diperbarui.' :
    'Profil berubah atau tidak lagi terhubung. Jalankan /editnaker lagi.');
}
module.exports = { startEditNaker, handleEditNaker };
