const { randomBytes } = require('node:crypto');
const { Markup } = require('telegraf');
const { Nakers } = require('../../models/users');
const { getBranchesForBot, normalizeBranchName } = require('../branch/branch.data');
const { beginPrivateFlow, clearPrivateFlow, isPrivateFlowExpired } = require('../../core/privateFlowSession');

const display = value => value || 'Belum diisi';
const buttons = (session, choices) => Markup.inlineKeyboard(
  [...choices, ['✖️ Batal', 'cancel']].map(([label, action]) =>
    [Markup.button.callback(label, `editnaker:${session.token}:${action}`)]),
);

async function startEditNaker(ctx, args, model = Nakers, allowed = getBranchesForBot) {
  if (ctx.chat?.type !== 'private') return ctx.reply('Gunakan /editnaker lewat japri bot.');
  if (args.length > 1 || (args.length && !/^\d+$/.test(args[0])))
    return ctx.reply('Gunakan /editnaker atau /editnaker <NIK milik Anda>.');

  const owner = String(ctx.from.id);
  const filter = { ID_TELEGRAM: owner, ...(args.length ? { NIK: args[0] } : {}) };
  const profiles = await model.find(filter).select('_id NIK NAMA BRANCH SERVICE_AREA LEVEL').limit(2).lean();
  if (!profiles.length) return ctx.reply('Profil yang terhubung ke akun Telegram Anda tidak ditemukan. Lakukan binding dengan /start.');
  if (profiles.length > 1) return ctx.reply('Ada lebih dari satu profil yang cocok. Gunakan /editnaker <NIK milik Anda> atau hubungi admin.');

  const profile = profiles[0];
  const branches = allowed(ctx.botInfo?.id);
  if (!branches.length) return ctx.reply('Belum ada branch yang dialokasikan untuk bot ini.');
  beginPrivateFlow(ctx, { step: 'EDIT_NAKER_BRANCH', owner, profileId: String(profile._id),
    token: randomBytes(8).toString('hex'), oldBranch: profile.BRANCH ?? null,
    oldArea: profile.SERVICE_AREA ?? null });
  const summary = [
    '👤 PROFIL NAKER', '', 'NIK: ' + display(profile.NIK), 'Nama: ' + display(profile.NAMA),
    'Service Area: ' + display(profile.SERVICE_AREA), 'Branch: ' + display(profile.BRANCH),
    'Level: ' + display(profile.LEVEL), '', 'Pilih branch. Untuk mengubah service area saja, pilih branch saat ini.',
  ].join('\n');
  return ctx.reply(summary, buttons(ctx.session, branches.map(b => [b.name, 'branch:' + b.id])));
}

async function handleEditNakerButton(ctx, model = Nakers, allowed = getBranchesForBot) {
  const session = ctx.session;
  const [, token, action, id] = String(ctx.callbackQuery?.data || '').split(':');
  const owner = String(ctx.from?.id);
  if (ctx.chat?.type !== 'private' || !session?.step?.startsWith('EDIT_NAKER_') ||
      session.owner !== owner || session.token !== token || isPrivateFlowExpired(ctx))
    return ctx.answerCbQuery('Sesi tidak berlaku. Jalankan /editnaker lagi.');
  if (session.step === 'EDIT_NAKER_SAVING') return ctx.answerCbQuery('Sedang menyimpan.');

  if (action === 'cancel') {
    clearPrivateFlow(ctx);
    await ctx.answerCbQuery();
    return ctx.editMessageText('Edit profil dibatalkan.');
  }
  const branches = allowed(ctx.botInfo?.id);
  if (action === 'branch' && session.step === 'EDIT_NAKER_BRANCH') {
    const branch = branches.find(b => String(b.id) === id);
    if (!branch?.serviceAreas?.length) return ctx.answerCbQuery('Pilihan branch tidak tersedia.');
    session.branchId = id;
    session.step = 'EDIT_NAKER_AREA';
    await ctx.answerCbQuery();
    return ctx.editMessageText('Branch: ' + branch.name + '\nPilih service area:',
      buttons(session, branch.serviceAreas.map(area => [area.name, 'area:' + area.id])));
  }
  const branch = branches.find(b => String(b.id) === session.branchId);
  if (action === 'area' && session.step === 'EDIT_NAKER_AREA') {
    const area = branch?.serviceAreas?.find(a => String(a.id) === id);
    if (!area) return ctx.answerCbQuery('Service area tidak tersedia untuk branch ini.');
    session.areaId = id;
    session.step = 'EDIT_NAKER_CONFIRM';
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      'Periksa perubahan:\nBranch: ' + display(session.oldBranch) + ' → ' + normalizeBranchName(branch.name) +
      '\nService Area: ' + display(session.oldArea) + ' → ' + area.name,
      buttons(session, [['✅ Simpan', 'save']]),
    );
  }
  if (action === 'save' && session.step === 'EDIT_NAKER_CONFIRM') {
    const area = branch?.serviceAreas?.find(a => String(a.id) === session.areaId);
    if (!area) return ctx.answerCbQuery('Pilihan tidak lagi tersedia. Jalankan /editnaker lagi.');
    session.step = 'EDIT_NAKER_SAVING';
    await ctx.answerCbQuery();
    try {
      const result = await model.updateOne({
        _id: session.profileId, ID_TELEGRAM: owner, BRANCH: session.oldBranch, SERVICE_AREA: session.oldArea,
      }, { $set: { BRANCH: normalizeBranchName(branch.name), SERVICE_AREA: area.name } }, { runValidators: true });
      clearPrivateFlow(ctx);
      return ctx.editMessageText(result.matchedCount === 1 ? '✅ Branch dan service area berhasil disimpan.' :
        'Profil berubah atau tidak lagi terhubung. Jalankan /editnaker lagi.');
    } catch (error) {
      clearPrivateFlow(ctx);
      console.warn('Edit branch/service area gagal |', error.name);
      return ctx.editMessageText('Penyimpanan belum terkonfirmasi. Cek profil dengan /editnaker sebelum mencoba lagi.');
    }
  }
  return ctx.answerCbQuery('Pilihan tidak berlaku untuk langkah ini.');
}

module.exports = { startEditNaker, handleEditNakerButton };
