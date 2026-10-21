// ../core/dispathcer.js

const { nakerCommand } = require("../modules/naker/naker.controller");
const { handleNakerFlow } = require("../modules/naker/naker.flow");
const { findNaker } = require("../modules/naker/naker.service");
const { handleMessage } = require("./botLogic"); // ✅ TAMBAHKAN
const { startCommand } = require("../modules/auth/auth.controller");
const { handleAuthFlow } = require("../modules/auth/auth.flow");
const { cekWorkzoneCommand } = require("../modules/group/group.controller");
const { Markup } = require("telegraf");
const { branches, findBranch } = require("../modules/branch/branch.data");
const { fetchReport } = require("../modules/ttr/ttr.service");
const { runTTR } = require("../modules/ttr/ttr.service");
const { runTtrOfficer } = require("../modules/ttrOfficer/ttrOfficer.service");
const { runTtrb2b } = require("../modules/ttrb2b/ttrb2b.service");
const { runTtrHD } = require("../modules/ttrHD/ttrHD.service");
const { runGamas } = require("../modules/gamas/gamas.service");
const { findOfficer } = require("../modules/naker/naker.service");
const { runPloting } = require("../modules/ploting/ploting.runner");
const {
  sendEvidence,
} = require("../modules/hookDompis/hookDompis.kirimTelegram");

const {
  jalanSegmentasi,
} = require("../modules/segmentasiTiket/segmentasi.start");
const {
  clearSegmentTickets,
  clearAllTickets,
} = require("../modules/segmentasiTiket/segmentasi.clear");

const { Idgrupb2b, IdgrupHD } = require("../models/idgrupTelegram");
const { bindFfgGroup } = require("../modules/ffg/ffg.binding");
const { startGroupSetup, setSetupMessage } = require("./groupSetupSession");
const { beginPrivateFlow, isPrivateFlowExpired, clearPrivateFlow } = require("./privateFlowSession");

// =========================================================================
// Helper bersama untuk command "/ttrb2b_<BRANCH>" dan "/monHD_<BRANCH>".
// Dulu dua command ini punya logic yang copy-paste identik (~100 baris x2),
// sekarang cukup satu fungsi + Model yang berbeda.
// =========================================================================
async function handleGroupBinding(ctx, { text, prefix, Model, label }) {
  if (!["group", "supergroup"].includes(ctx.chat.type)) {
    return ctx.reply("⚠️ Command ini hanya bisa digunakan di group.");
  }

  const branch = text.replace(prefix, "").trim().toUpperCase();

  if (!branch) {
    return ctx.reply(
      `⚠️ Format salah.\n\nContoh:\n/${label === "B2B" ? "ttrb2b_" : "monHD_"}SURABAYA`,
    );
  }

  const branchData = findBranch(branch);

  if (!branchData) {
    return ctx.reply(`❌ Branch <b>${branch}</b> tidak terdaftar.`, {
      parse_mode: "HTML",
    });
  }

  const chatId = String(ctx.chat.id);
  const namaGrup = ctx.chat.title || "-";
  const topicId = ctx.message?.message_thread_id
    ? String(ctx.message.message_thread_id)
    : null;

  try {
    const dataExisting = await Model.findOne({
      ID_GRUP: chatId,
      ID_TOPIC_GRUP: topicId,
      BRANCH: branch,
    }).lean();

    if (dataExisting) {
      return ctx.reply(
        `⚠️ <b>Data grup sudah terdaftar.</b>\n\n` +
          `🏢 Branch : <b>${dataExisting.BRANCH || "-"}</b>\n` +
          `👥 Grup : <b>${dataExisting.NAMA_GRUP || "-"}</b>\n` +
          `🆔 ID Grup : <code>${chatId}</code>\n` +
          `🧵 Topic : <code>${topicId || "-"}</code>\n\n` +
          `Silahkan hubungi admin untuk perubahan konfigurasi.`,
        { parse_mode: "HTML" },
      );
    }

    const data = await Model.create({
      BRANCH: branch,
      ID_GRUP: chatId,
      NAMA_GRUP: namaGrup,
      ID_TOPIC_GRUP: topicId,
      STATUS: "ACTIVE",
    });

    console.log(`✅ GRUP ${label} TERSIMPAN:`, data);

    return ctx.reply(
      `✅ <b>Grup TTR ${label} berhasil disimpan</b>\n\n` +
        `🏢 Branch : <b>${branch}</b>\n` +
        `👥 Grup : <b>${namaGrup}</b>\n` +
        `🆔 ID Grup : <code>${chatId}</code>\n` +
        `🧵 Topic : <code>${topicId || "-"}</code>\n` +
        `📌 Status : <b>ACTIVE</b>`,
      { parse_mode: "HTML" },
    );
  } catch (err) {
    console.error(`❌ ERROR SIMPAN GRUP ${label}:`, err);
    return ctx.reply(`❌ Gagal menyimpan konfigurasi grup ${label}.`);
  }
}

async function dispatch(ctx) {
  const text = ctx.message?.text || "";
  const ffgTestCommand = text.trim().split(/\s+/)[0].replace(/@[A-Za-z0-9_]+$/, '').toLowerCase();
  if (['/tesffgremin', '/tesffgalltiket'].includes(ffgTestCommand)) {
    const { testFfg } = require('../modules/ffg/ffg.commands');
    return testFfg(ctx, ffgTestCommand === '/tesffgremin' ? 'active' : 'hourly');
  }

  if (/^\/setgamas(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(text)) {
    const { bindGamasGroup } = require("../modules/gamas/gamas.binding");
    return bindGamasGroup(ctx);
  }

  const isPrivateChat = ctx.chat?.type === "private";
  const isCommand = (name) => new RegExp(`^/${name}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`).test(text);

  // /set selalu harus dapat memulai ulang setup, bahkan bila ada flow lain aktif.
  if (isCommand("set")) {
    if (!ctx.chat.type.includes("group")) {
      return ctx.reply("⚠️ Hanya bisa di group");
    }

    const setup = startGroupSetup(ctx);
    const reply = ctx.message.reply_to_message;
    if (reply?.forum_topic_created) {
      setup.group.topic_name = reply.forum_topic_created.name;
    }

    const message = await ctx.reply(
      "📦 Pilih Jenis Group:",
      Markup.inlineKeyboard([
        [Markup.button.callback("📦 ORDER", "main_ORDER")],
        [Markup.button.callback("📊 REPORT", "main_REPORT")],
        [Markup.button.callback("🛡️ KAWAL", "main_KAWAL")],
      ]),
    );
    setSetupMessage(ctx, setup, message.message_id);
    return;
  }

  // Binding dan pendaftaran berisi data personal; hanya boleh di chat pribadi.
  if (isCommand("start")) {
    if (!isPrivateChat) {
      return ctx.reply("⚠️ Command /start hanya dapat digunakan melalui chat pribadi dengan bot.");
    }

    beginPrivateFlow(ctx, { step: "WAIT_NIK" });
    return ctx.reply("👋 Selamat datang!\n\nSilakan masukkan NIK Anda untuk binding akun.");
  }

  if (isCommand("register")) {
    if (!isPrivateChat) {
      return ctx.reply("⚠️ Command /register hanya dapat digunakan melalui chat pribadi dengan bot.");
    }

    beginPrivateFlow(ctx, { step: "REGISTER_WAIT_NIK", register: {} });
    return ctx.reply("🆔 Masukkan NIK Anda:");
  }

  if (isCommand("cancel") && isPrivateChat) {
    if (!ctx.session?.step) return ctx.reply("Tidak ada proses aktif.");
    clearPrivateFlow(ctx);
    return ctx.reply("✅ Proses dibatalkan. Ketik /start atau /register untuk memulai lagi.");
  }

  // Bersihkan sesi lama yang mungkin pernah dibuat sebelum pembatasan private chat.
  if (!isPrivateChat && (ctx.session?.step === "WAIT_NIK" || ctx.session?.step?.startsWith("REGISTER"))) {
    ctx.session = null;
    return ctx.reply("⚠️ Proses binding dan registrasi hanya dapat dilanjutkan lewat chat pribadi dengan bot.");
  }

  if (isPrivateChat && ctx.session?.step && isPrivateFlowExpired(ctx)) {
    clearPrivateFlow(ctx);
    return ctx.reply("⌛ Sesi sudah berakhir. Ketik /start atau /register untuk memulai kembali.");
  }

  // console.log("STEP:", ctx.session?.step);
  // // console.log("TEXT:", ctx.message?.text);
  // console.log("SESSION:", ctx.session);

  // ======================
  // PRIORITAS: FLOW
  // ======================
  if (ctx.session?.step) {
    //arahkan ke auth flow kalau step auth
    if (ctx.session.step.startsWith("REGISTER")) {
      return handleAuthFlow(ctx);
    }

    return handleNakerFlow(ctx);
  }

  // ======================
  // COMMAND
  // ======================
  if (text.startsWith("/naker")) {
    const args = text.split(" ").slice(1);
    //const data = await fetchReport(); // ⬅️ ini kuncinya
    //console.log(data);
    return nakerCommand(ctx, args);
  }

  //sendEvidence({ incident, type, chatId, topicId }
  if (text === "/teskirimevident") {
    await sendEvidence({
      incident: "INC123456",
      type: "CLOSE",
      chatId: ctx.chat.id,
      topicId: ctx.message?.message_thread_id || null,
    });
    return ctx.reply("Tes kirim evident berhasil 🚀");
  }

  const manualReports = [
    { matches: isCommand("tesgamas"), command: "/tesgamas", message: "Laporan GAMAS sedang diproses. Hasil dikirim ke grup GAMAS yang sudah terdaftar.", run: runGamas },
    { matches: text === "/testtr", command: "/testtr", message: "TTR sedang diproses 🚀", run: runTTR },
    { matches: text === "/tesploting", command: "/tesploting", message: "Ploting Test sedang diproses 🚀", run: runPloting },
    { matches: text.startsWith("/cekofficer"), command: "/cekofficer", message: "Officer sedang diproses 🚀", run: runTtrOfficer },
    { matches: text.startsWith("/tesgrupb2b"), command: "/tesgrupb2b", message: "TTR B2B sedang diproses 🚀", run: runTtrb2b },
    { matches: text.startsWith("/tesgrupHD"), command: "/tesgrupHD", message: "TTR HD sedang diproses 🚀", run: runTtrHD },
  ];
  const manualReport = manualReports.find(report => report.matches);
  if (manualReport) {
    const { startManualReport } = require("./manualReport");
    return startManualReport(ctx, { ...manualReport, prepare: jalanSegmentasi });
  }

  if (/^\/ffg_/i.test(text)) return bindFfgGroup(ctx);

  if (text.startsWith("/ttrb2b_")) {
    return handleGroupBinding(ctx, {
      text,
      prefix: /^\/ttrb2b_/i,
      Model: Idgrupb2b,
      label: "B2B",
    });
  }

  if (text.startsWith("/monHD_")) {
    return handleGroupBinding(ctx, {
      text,
      prefix: /^\/monHD_/i,
      Model: IdgrupHD,
      label: "HD",
    });
  }

  // ======================
  // FALLBACK → botLogic 🔥
  // ======================
  const res = await handleMessage({
    userId: ctx.from.id,
    text,
    platform: "telegram",
    name: ctx.from.first_name,
    chatId: ctx.chat.id,
    isGroup: ctx.chat.type.includes("group"),
  });

  if (res?.reply) {
    return ctx.reply(res.reply);
  }
}

module.exports = { dispatch };
