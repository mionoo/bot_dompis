// naker.flow.js

const {
  findNaker,
  updateTelegramId,
  escapeMarkdown,
  formatField,
} = require("./naker.service");

const { getBranchAllocation } = require("../branch/branch.data");

async function handleNakerFlow(ctx) {
  const step = ctx.session?.step;

  if (step === "WAIT_NIK") {
    const nikText = String(ctx.message?.text || "").trim();
    const nik = Number(nikText);

    // validasi input
    if (!/^\d+$/.test(nikText) || nik <= 0) {
      return ctx.reply("❌ NIK harus berupa angka positif tanpa spasi. Silakan masukkan ulang.");
    }

    const data = await findNaker(nik);

    // ❌ jika tidak ditemukan
    if (!data) {
      ctx.session = null;
      return ctx.reply("❌ Data NIK tidak ditemukan.\nSilakan ketik /register untuk mendaftar.");
    }



    console.log("Data Naker:", data); // debug log
    const currentBotId = ctx.botInfo.id;

    const { normalizedBranch: branchName, isAllowed, correctBot } = getBranchAllocation(
      currentBotId,
      data.BRANCH,
    );

    console.log("BOT ID :", currentBotId);
    console.log("BRANCH :", branchName);
    console.log("IS ALLOWED :", isAllowed);

    if (!isAllowed) {
      ctx.session = null;
      return ctx.reply(
        `❌ Branch ${branchName} tidak tersedia di bot ini.

Silakan gunakan bot yang sesuai di bawah ini dan ulangi proses registrasi:

🤖 ${correctBot?.name}
${correctBot?.username}`,
      );
      //       return ctx.reply(
      //         `❌ Branch *${escapeMarkdown(branchName)}* tidak tersedia di bot ini.

      // Silakan gunakan bot berikut:

      // 🤖 *${escapeMarkdown(correctBot?.name || "-")}*
      // ${escapeMarkdown(correctBot?.username || "-")}`,
      //         {
      //           parse_mode: "MarkdownV2",
      //         },
      //       );
    }

   

    // 🔒 optional: cek sudah terdaftar
    if (data.ID_TELEGRAM && data.ID_TELEGRAM !== ctx.from.id) {
      ctx.session = null;
      console.log(
        `⚠️ NIK ${nik} sudah terdaftar dengan Telegram ID ${data.ID_TELEGRAM}`,
      );
      return ctx.reply(
        "⚠️ NIK sudah terdaftar di akun lain.\nSilakan hubungi PIC Area.",
      );
    }

    // ✅ simpan telegram ID
    await updateTelegramId(nik, ctx.from.id);

    ctx.session = null;

    const message = `
✅ *Registrasi Berhasil*

━━━━━━━━━━━━━━━━━━━
${formatField("👤 *Nama*", data.NAMA)}
${formatField("🆔 *NIK*", data.NIK)}
${formatField("📍 *Service Area*", data.SERVICE_AREA)}
${formatField("🏢 *Branch*", data.BRANCH)}
${formatField("🧑‍💼 *Position*", data.POSITION_NAME)}
━━━━━━━━━━━━━━━━━━━
`;

    return ctx.reply(message, { parse_mode: "MarkdownV2" });
  }

  // Safety net: kalau suatu saat ada step baru yang belum ditangani di
  // sini, jangan sampai bot diam total — beri tahu user dan biarkan
  // mereka mulai ulang, daripada session nyangkut sampai TTL habis.
  ctx.session = null;
  return ctx.reply("⚠️ Sesi tidak dikenali. Ketik /start untuk memulai ulang.");
}

module.exports = { handleNakerFlow };
