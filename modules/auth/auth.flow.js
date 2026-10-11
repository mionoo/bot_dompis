// modules/auth/auth.flow.js

const { registerUser } = require("./auth.service");
const { Markup } = require("telegraf");
const { branches } = require("../branch/branch.data");
const { findNaker } = require("../naker/naker.service");

async function handleAuthFlow(ctx) {
  const step = ctx.session?.step;
  const text = ctx.message?.text;

  // =========================
  // REGISTER NAME
  // =========================
  if (step === "REGISTER_NAME") {
    await registerUser({
      userId: ctx.from.id,
      platform: "telegram",
      name: text,
    });

    ctx.session = null;

    return ctx.reply(`✅ Registrasi berhasil\nNama: ${text}`);
  }

  // =========================
  // REGISTER NIK
  // =========================
  if (step === "REGISTER_WAIT_NIK") {
    const nikText = String(text || "").trim();
    const nik = Number(nikText);

    // validasi input
    if (!/^\d+$/.test(nikText) || nik <= 0) {
      return ctx.reply("❌ NIK harus berupa angka positif tanpa spasi. Silakan masukkan ulang.");
    }

    // cek NIK di database
    const existing = await findNaker(nik);

    console.log("Existing Naker:", existing);

    if (existing) {
      ctx.session = null;

      return ctx.reply(
        "❌ NIK sudah terdaftar\nSilahkan lakukan /start untuk binding akun anda",
      );
    }

    // simpan ke session
    ctx.session.register.nik = nik;
    ctx.session.step = "REGISTER_PICK_POSITION";

    const keyboard = [
      [{ text: "OFFICER", callback_data: "reg_pos_OFFICER" }],
      [{ text: "HSA", callback_data: "reg_pos_HSA" }],
      [{ text: "OSA", callback_data: "reg_pos_OSA" }],
      [{ text: "KORLAP", callback_data: "reg_pos_KORLAP" }],
      [{ text: "HELP DESK", callback_data: "reg_pos_HELP_DESK" }],
      [{ text: "TEKNISI", callback_data: "reg_pos_TEKNISI" }],
    ];

    return ctx.reply("👤 Pilih Position:", Markup.inlineKeyboard(keyboard));
  }

  // =========================
  // STEP TIDAK DIKENALI DI SINI
  // =========================
  // Step-step lain dalam alur registrasi (REGISTER_PICK_POSITION,
  // REGISTER_PICK_BRANCH, REGISTER_PICK_SA, REGISTER_PICK_TEKNISI_TYPE)
  // ditangani lewat tombol inline (bot.action(...) di adapters/telegram.js),
  // bukan lewat teks. Sebelumnya kalau user mengetik teks biasa saat berada
  // di salah satu step tersebut, fungsi ini diam-diam return undefined —
  // tidak ada balasan sama sekali, dan sesi tetap nyangkut sampai TTL 15
  // menit habis. Dari sisi user ini terlihat seperti bot stuck/hang.
  // Fallback ini memastikan user selalu dapat feedback.
  return ctx.reply(
    "⚠️ Silakan gunakan tombol yang tersedia di atas untuk melanjutkan.\nKetik /cancel untuk membatalkan proses.",
  );
}

module.exports = {
  handleAuthFlow,
};
