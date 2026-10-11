// telegram.js
const { Telegraf, session } = require("telegraf");
const { dispatch } = require("../core/dispatcher");
const { Markup } = require("telegraf");
const {
  saveIdGroup,
  saveIdGroupKAWAL,
} = require("../modules/group/group.service");
const {
  branches,
  getBranchAllocation,
  getBranchesForBot,
} = require("../modules/branch/branch.data");
const { logging } = require("googleapis/build/src/apis/logging");
const {
  Assist1,
  Assist2,
  Assist3,
  AssistSuramadu,
} = require("../core/telegramInstance");
const { simpanNewNaker, findNaker } = require("../modules/naker/naker.service");
const { getActiveGroupSetup, finishGroupSetup } = require("../core/groupSetupSession");
const { isPrivateFlowExpired, clearPrivateFlow } = require("../core/privateFlowSession");

// 🔒 ID chat admin yang menerima notifikasi error. Bisa dioverride lewat .env
// (ADMIN_CHAT_ID=...) tanpa mengubah kode. Fallback ke nilai lama supaya
// perilaku tidak berubah kalau .env belum diupdate.
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID
  ? Number(process.env.ADMIN_CHAT_ID)
  : 68619032;

// =====================================================================
// 🔥 SATU PINTU: wiring session + error handling untuk semua bot
// =====================================================================
// Sebelumnya tiap bot (Assist1..AssistSuramadu) punya blok on("text") yang
// copy-paste identik, dan HANYA blok on("text") itu yang dibungkus
// try/catch. Semua tombol (bot.action(...) di bawah) sama sekali tidak
// punya penanganan error, dan Telegraf secara default akan melempar ulang
// (rethrow) error yang tidak tertangani. Karena `bot.launch()` di paling
// bawah file ini tidak pernah di-`await`/`.catch()`, rethrow itu menjadi
// unhandled promise rejection di top-level proses Node → proses MATI TOTAL
// (keempat bot ikut down) hanya karena satu error kecil saat user klik
// tombol (mis. query database gagal sesaat).
//
// Fix-nya: daftarkan `bot.catch()` di setiap instance. Telegraf akan
// memanggil ini untuk SEMUA jenis update (text, action/tombol, dll),
// jadi tidak perlu try/catch manual berulang-ulang lagi.
const BOTS = [
  { bot: Assist1, label: "Assist1" },
  { bot: Assist2, label: "Assist2" },
  { bot: Assist3, label: "Assist3" },
  { bot: AssistSuramadu, label: "AssistSuramadu" },
];

BOTS.forEach(({ bot, label }) => {
  bot.use(session());

  bot.on("text", (ctx) => dispatch(ctx));

  bot.catch(async (err, ctx) => {
    console.error(`❌ [${label}] Unhandled error:`, err);

    // Jangan biarkan user nyangkut di step lama gara-gara error di tengah flow.
    ctx.session = null;

    // Notifikasi ke admin dibungkus try/catch sendiri: kalau gagal terkirim
    // (mis. ADMIN_CHAT_ID tidak valid / bot diblokir admin), jangan sampai
    // ikut menjadi unhandled rejection kedua.
    try {
      await bot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `⚠️ <b>ERROR [${label}]</b>\n\n<code>${String(err?.message || err)}</code>`,
        { parse_mode: "HTML" },
      );
    } catch (notifyErr) {
      console.error(`❌ [${label}] Gagal kirim notifikasi error ke admin:`, notifyErr.message);
    }
  });
});

/////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////// button setup GRUP //////////////////////////////////////////////////////

const saveRegister = async (ctx) => {
  console.log("HASIL REGISTER:", ctx.session.register);

  await simpanNewNaker({
    NIK: ctx.session.register.nik,

    POSITION_NAME: ctx.session.register.position,

    LEVEL: ctx.session.register.level || ctx.session.register.position || "-",

    BRANCH: ctx.session.register.branch_name || "-",

    SERVICE_AREA: ctx.session.register.service_area?.name || "-",

    ID_TELEGRAM: ctx.from.id,

    NAMA: ctx.from.first_name || "-",

    USERNAME_TELEGRAM: ctx.from.username || "-",
  });

  await ctx.editMessageText(
    `✅ DATA REGISTER

🆔 NIK: ${ctx.session.register.nik}

👤 Position:
${ctx.session.register.position}


📍 Branch:
${ctx.session.register.branch?.name || "-"}

📍 SA:
${ctx.session.register.service_area?.name || "-"}

✅ Berhasil disimpan`,
  );

  ctx.session = null;
};

const ensurePrivateRegistration = async (ctx) => {
  if (ctx.chat?.type === "private") return true;

  await ctx.answerCbQuery("⚠️ Registrasi hanya dapat dilakukan lewat chat pribadi.");
  return false;
};

const ensureActiveRegistration = async (ctx) => {
  if (!(await ensurePrivateRegistration(ctx))) return false;
  if (!isPrivateFlowExpired(ctx)) return true;

  clearPrivateFlow(ctx);
  await ctx.answerCbQuery("⌛ Sesi sudah berakhir. Ketik /register untuk memulai lagi.");
  return false;
};

const getBranchButtonsForCurrentBot = (ctx, callbackPrefix) =>
  getBranchesForBot(ctx.botInfo.id).map((branch) => [
    Markup.button.callback(branch.name, `${callbackPrefix}_${branch.id}`),
  ]);

const rejectUnallocatedBranch = async (ctx, branchName, retryAction) => {
  const { isAllowed, correctBot } = getBranchAllocation(ctx.botInfo.id, branchName);
  if (isAllowed) return false;

  await ctx.answerCbQuery("❌ Branch tidak tersedia di bot ini.");
  await ctx.reply(
    `❌ Branch ${branchName} tidak tersedia di bot ini.

Silakan gunakan bot yang sesuai di bawah ini dan ulangi proses ${retryAction}:

🤖 ${correctBot?.name || "-"}
${correctBot?.username || "-"}`,
  );
  return true;
};

const registerBranchHandler = async (ctx) => {
  if (!(await ensureActiveRegistration(ctx))) return;
  if (ctx.session?.step !== "REGISTER_PICK_BRANCH") {
    return ctx.answerCbQuery("❌ Session tidak valid");
  }

  const branchId = ctx.match[1];

  const branch = branches.find((b) => b.id === branchId);

  if (!branch) {
    return ctx.answerCbQuery("❌ Branch tidak ditemukan");
  }

  const branchName = branch.name.replace("BRANCH ", "");
  if (await rejectUnallocatedBranch(ctx, branchName, "registrasi")) {
    ctx.session = null;
    return;
  }

  // simpan branch asli + nama kota
  ctx.session.register.branch = branch;
  ctx.session.register.branch_name = branchName;

  await ctx.answerCbQuery();

  // // =========================
  // // OFFICER / HELP_DESK
  // // langsung simpan
  // // =========================

  const position = ctx.session.register.position;

  if (position === "OFFICER" || position === "HELP_DESK") {
    ctx.session.register.level = "Officer 2";

    return await saveRegister(ctx);
  }

  // =========================
  // selain itu pilih SA
  // =========================
  ctx.session.step = "REGISTER_PICK_SA";

  const buttons = branch.serviceAreas.map((sa) => [
    Markup.button.callback(sa.name, `tos_pis_${branch.id}_${sa.id}`),
  ]);

  return ctx.editMessageText(
    `📍 Branch: ${branch.name}

Pilih Service Area:`,
    Markup.inlineKeyboard(buttons),
  );
};

const registerSAHandler = async (ctx) => {
  if (!(await ensureActiveRegistration(ctx))) return;
  if (ctx.session?.step !== "REGISTER_PICK_SA") {
    return ctx.answerCbQuery("❌ Session tidak valid");
  }

  const branchId = ctx.match[1];
  const serviceId = ctx.match[2];

  const branch = branches.find((b) => b.id === branchId);

  //  console.log(`branch = ${branch} | service area = ${serviceArea}`);

  const serviceArea = branch?.serviceAreas.find((sa) => sa.id === serviceId);

  if (!branch || !serviceArea) {
    return ctx.answerCbQuery("❌ Data tidak valid");
  }

  ctx.session.register.service_area = serviceArea;

  await ctx.answerCbQuery();

  return await saveRegister(ctx);
};

// =========================
// HANDLE POSITION
// =========================
const registerPositionHandler = async (ctx) => {
  if (!(await ensureActiveRegistration(ctx))) return;
  if (ctx.session?.step !== "REGISTER_PICK_POSITION") {
    return ctx.answerCbQuery("❌ Session tidak valid");
  }

  const position = ctx.match[1];

  ctx.session.register.position = position;

  await ctx.answerCbQuery();

  // =========================
  // TEKNISI -> pilih B2B/B2C dulu
  // =========================
  if (position === "TEKNISI") {
    ctx.session.step = "REGISTER_PICK_TEKNISI_TYPE";

    return ctx.editMessageText(
      `👨‍🔧 Position: TEKNISI

Pilih Tipe Teknisi:`,
      Markup.inlineKeyboard([
        [Markup.button.callback("B2B", "reg_teknisi_B2B")],
        [Markup.button.callback("B2C", "reg_teknisi_B2C")],
      ]),
    );
  }

  // =========================
  // selain teknisi -> langsung pilih branch
  // =========================
  ctx.session.step = "REGISTER_PICK_BRANCH";

  const buttons = getBranchButtonsForCurrentBot(ctx, "reg_kota");

  return ctx.editMessageText(
    `👤 Position: ${position}

📍 Pilih Branch:`,
    Markup.inlineKeyboard(buttons),
  );
};

// =========================
// HANDLE TEKNISI TYPE
// =========================
const registerTeknisiTypeHandler = async (ctx) => {
  if (!(await ensureActiveRegistration(ctx))) return;
  if (ctx.session?.step !== "REGISTER_PICK_TEKNISI_TYPE") {
    return ctx.answerCbQuery("❌ Session tidak valid");
  }

  const teknisiType = ctx.match[1];

  ctx.session.register.level = teknisiType;

  await ctx.answerCbQuery();

  // lanjut pilih branch
  ctx.session.step = "REGISTER_PICK_BRANCH";

  const buttons = getBranchButtonsForCurrentBot(ctx, "reg_kota");

  return ctx.editMessageText(
    `👨‍🔧 Teknisi ${teknisiType}

📍 Pilih Branch:`,
    Markup.inlineKeyboard(buttons),
  );
};

// =========================
// ACTION
// =========================
Assist1.action(/^reg_kota_(.+)$/, registerBranchHandler);
Assist1.action(/^tos_pis_(.+)_(.+)$/, registerSAHandler);
Assist1.action(/^reg_pos_(.+)$/, registerPositionHandler);
Assist1.action(/^reg_teknisi_(.+)$/, registerTeknisiTypeHandler);

Assist2.action(/^reg_kota_(.+)$/, registerBranchHandler);
Assist2.action(/^tos_pis_(.+)_(.+)$/, registerSAHandler);
Assist2.action(/^reg_pos_(.+)$/, registerPositionHandler);
Assist2.action(/^reg_teknisi_(.+)$/, registerTeknisiTypeHandler);

Assist3.action(/^reg_kota_(.+)$/, registerBranchHandler);
Assist3.action(/^tos_pis_(.+)_(.+)$/, registerSAHandler);
Assist3.action(/^reg_pos_(.+)$/, registerPositionHandler);
Assist3.action(/^reg_teknisi_(.+)$/, registerTeknisiTypeHandler);

AssistSuramadu.action(/^reg_kota_(.+)$/, registerBranchHandler);
AssistSuramadu.action(/^tos_pis_(.+)_(.+)$/, registerSAHandler);
AssistSuramadu.action(/^reg_pos_(.+)$/, registerPositionHandler);
AssistSuramadu.action(/^reg_teknisi_(.+)$/, registerTeknisiTypeHandler);

////////////////////////////////////// button setup NAKER //////////////////////////////////////////////////////

////////////////////////////////////// button setup NAKER //////////////////////////////////////////////////////

const getSetupOrReject = async (ctx, expectedStep) => {
  const setup = getActiveGroupSetup(ctx);
  if (setup && (!expectedStep || setup.step === expectedStep)) return setup;

  await ctx.answerCbQuery("⚠️ Setup ini sudah diganti atau kedaluwarsa. Ketik /set lagi.");
  return null;
};

const saveGroupSetup = async (ctx, setup, branch, serviceArea = null) => {
  if (setup.isSaving) {
    return ctx.answerCbQuery("⏳ Setup sedang disimpan.");
  }
  setup.isSaving = true;

  try {
  const type = setup.groupType;

  const data = {
    BRANCH: branch?.name || "-",
    SERVICE_AREA: serviceArea?.name || "-",

    MODE_KAWAL: setup.kawalMode || null,

    ID_GRUP: setup.group.chat_id,
    NAMA_GRUP: setup.group.title,
    NAMA_SUB_TOPIC: setup.group.topic_name,
    ID_TOPIC_GRUP: setup.group.thread_id,

    TIPE_GRUP: type,
    STATUS: "ACTIVE",
  };

  if (type === "KAWAL") {
    await saveIdGroupKAWAL(data);
  } else {
    await saveIdGroup(data);
  }

  await ctx.editMessageText(
    `✅ Group berhasil diset

📦 TYPE : ${type}
${type === "KAWAL" ? `🛡️ MODE : ${setup.kawalMode}\n` : ""}

📍 BRANCH : ${data.BRANCH}
📍 SERVICE AREA : ${data.SERVICE_AREA}

🆔 Group : ${data.ID_GRUP}
📌 Nama : ${data.NAMA_GRUP}
🧵 Topic ID : ${data.ID_TOPIC_GRUP}
📝 Topic : ${data.NAMA_SUB_TOPIC || "-"}`,
  );

  finishGroupSetup(setup);
  } catch (error) {
    // Biarkan sesi tetap aktif supaya tombol dapat dicoba kembali setelah gangguan sementara.
    setup.isSaving = false;
    throw error;
  }
};

const groupMainTypeHandler = async (ctx) => {
  const setup = await getSetupOrReject(ctx, "GROUP_PICK_MAIN_TYPE");
  if (!setup) return;
  const type = ctx.match[1];

  await ctx.answerCbQuery();

  setup.groupType = type;

  if (type === "KAWAL") {
    setup.step = "KAWAL_MODE";

    return ctx.editMessageText(
      "🛡️ Pilih Tipe Pengawalan:",
      Markup.inlineKeyboard([
        [Markup.button.callback("🏢 PENGAWALAN BRANCH", "kawal_BRANCH")],
        [
          Markup.button.callback(
            "📍 PENGAWALAN SERVICE AREA",
            "kawal_SERVICE_AREA",
          ),
        ],
      ]),
    );
  }

  setup.step = "PICK_BRANCH";

  const buttons = getBranchButtonsForCurrentBot(ctx, "group_branch");

  return ctx.editMessageText(
    `📦 ${type}

Pilih BRANCH:`,
    Markup.inlineKeyboard(buttons),
  );
};

const groupKawalModeHandler = async (ctx) => {
  const setup = await getSetupOrReject(ctx, "KAWAL_MODE");
  if (!setup) return;
  const mode = ctx.match[1];

  await ctx.answerCbQuery();

  setup.kawalMode = mode;
  setup.step = "PICK_BRANCH";

  const buttons = getBranchButtonsForCurrentBot(ctx, "group_branch");

  return ctx.editMessageText(
    `🛡️ KAWAL ${mode}

Pilih BRANCH:`,
    Markup.inlineKeyboard(buttons),
  );
};

const groupBranchHandler = async (ctx) => {
  const setup = await getSetupOrReject(ctx, "PICK_BRANCH");
  if (!setup) return;
  const branchId = ctx.match[1];

  const branch = branches.find((b) => b.id === branchId);

  if (!branch) {
    return ctx.answerCbQuery("❌ Branch tidak ditemukan");
  }

  if (await rejectUnallocatedBranch(ctx, branch.name.replace("BRANCH ", ""), "setup group")) {
    finishGroupSetup(setup);
    return;
  }

  await ctx.answerCbQuery();

  setup.branch = branch;

  // ======================
  // KAWAL BRANCH
  // ======================
  if (setup.groupType === "KAWAL" && setup.kawalMode === "BRANCH") {
    return saveGroupSetup(ctx, setup, branch);
  }

  // ======================
  // ORDER
  // REPORT
  // KAWAL SERVICE AREA
  // ======================

  setup.step = "PICK_SERVICE_AREA";

  const buttons = branch.serviceAreas.map((sa) => [
    Markup.button.callback(sa.name, `group_sa_${branch.id}_${sa.id}`),
  ]);

  return ctx.editMessageText(
    `📍 Branch : ${branch.name}

Pilih SERVICE AREA:`,
    Markup.inlineKeyboard(buttons),
  );
};

const groupServiceAreaHandler = async (ctx) => {
  const setup = await getSetupOrReject(ctx, "PICK_SERVICE_AREA");
  if (!setup) return;
  const branchId = ctx.match[1];
  const serviceId = ctx.match[2];

  const branch = branches.find((b) => b.id === branchId);

  const serviceArea = branch?.serviceAreas.find((sa) => sa.id === serviceId);

  if (!branch || !serviceArea) {
    return ctx.answerCbQuery("❌ Data tidak valid");
  }

  await ctx.answerCbQuery();

  return saveGroupSetup(ctx, setup, branch, serviceArea);
};

[Assist1, Assist2, Assist3, AssistSuramadu].forEach((bot) => {
  bot.action(/^main_(ORDER|REPORT|KAWAL)$/, groupMainTypeHandler);

  bot.action(/^kawal_(BRANCH|SERVICE_AREA)$/, groupKawalModeHandler);

  bot.action(/^group_branch_(.+)$/, groupBranchHandler);

  bot.action(/^group_sa_(.+)_(.+)$/, groupServiceAreaHandler);
});

// launch() masing-masing bot dijalankan independen dan errornya ditangkap
// per-bot: kalau satu token invalid/network gagal, bot lain tetap jalan
// dan errornya ter-log jelas, bukan jadi unhandled rejection yang mematikan
// semua bot sekaligus.
BOTS.forEach(({ bot, label }) => {
  bot
    .launch()
    .then(() => console.log(`✅ Bot ${label} launched`))
    .catch((err) => console.error(`❌ Gagal launch bot ${label}:`, err));
});

//module.exports = { bot, bot2 }
