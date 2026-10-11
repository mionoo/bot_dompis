// //plotting.service.js

const { Nakers } = require("../../models/users");

const { fetchTicketsByServiceAreas } = require("./ploting.mongo");

const { analyzePloting } = require("./ploting.analyzer");

const { buildMessagePloting } = require("./ploting.formatter");

const { dariSACariZONEBOT } = require("./ploting.db");

const { sendGlobal, delay } = require("../../core/globalSender");

// ======================================================
// GET PIC MAPPING BY HSA
// ======================================================

async function getPicMappingByHSA() {
  const data = await Nakers.find({
    SERVICE_AREA: {
      $exists: true,
      $nin: ["", null],
    },

    BRANCH: {
      $exists: true,
      $nin: ["", null],
    },

    ID_TELEGRAM: {
      $exists: true,
      $nin: ["", null],
    },

    LEVEL: {
      $in: ["HSA", "Korlap", "OSA", "Officer 3"],
    },
  }).lean();

  const mapping = {};

  for (const user of data) {
    if (!user.ID_TELEGRAM) {
      continue;
    }

    const hsa = (user.SERVICE_AREA || "").toUpperCase().trim();

    const branch = (user.BRANCH || "").toUpperCase().trim();

    if (!hsa || !branch) {
      continue;
    }

    if (!mapping[hsa]) {
      mapping[hsa] = [];
    }

    mapping[hsa].push({
      chatId: user.ID_TELEGRAM,
      topic: user.ID_TOPIC_GRUP,
      branch,
    });
  }

  return mapping;
}

// ======================================================
// RUN PLOTING
// ======================================================

async function runPloting(ctx) {
  try {
    // ==================================================
    // 1. MAPPING PIC
    // ==================================================

    const mapping = await getPicMappingByHSA();

    if (!Object.keys(mapping).length) {
      console.log("❌ Tidak ada mapping");
      return;
    }

    const serviceAreas = Object.keys(mapping);

    console.log("SERVICE AREA:", serviceAreas);

    // ==================================================
    // 2. FETCH TICKET
    // ==================================================

    const tickets = await fetchTicketsByServiceAreas(serviceAreas);

    if (!tickets.length) {
      console.log("❌ Tidak ada tiket");
      return;
    }

    console.log("TOTAL TIKET:", tickets.length);

    // ==================================================
    // 3. ANALYZE
    // ==================================================

    const grouped = analyzePloting(tickets);

    if (!Object.keys(grouped).length) {
      console.log("❌ Tidak ada tiket yang perlu diploting");

      return;
    }

    // ==================================================
    // 4. LOOP HSA
    // ==================================================

    for (const hsa of Object.keys(grouped)) {
      const tiketList = grouped[hsa];

      const users = mapping[hsa];

      if (!users?.length) {
        console.log(`⚠️ PIC tidak ditemukan: ${hsa}`);

        continue;
      }

      // ==================================================
      // 5. CARI BOT
      // ==================================================

      const zone = await dariSACariZONEBOT(hsa);

      if (!zone) {
        console.log(`❌ BOT tidak ditemukan: ${hsa}`);

        continue;
      }

      // ==================================================
      // 6. BUILD MESSAGE
      // ==================================================

      const message = buildMessagePloting(hsa, tiketList);

      // ==================================================
      // 7. KIRIM KE PIC
      // ==================================================

      for (const user of users) {
        console.log(`📤 KIRIM PLOTING ${hsa}:`, user.chatId);

        await sendGlobal({
          zone,
          chatId: user.chatId,
          topic: user.topic,
          message,
        });

        await delay(500);
      }
    }
  } catch (err) {
    console.error("❌ ERROR runPloting:", err);
  }
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  runPloting,
  getPicMappingByHSA,
};

// const { Nakers } = require('../../models/users')

// async function getPicMappingByHSA() {
//   const data = await Nakers.find({
//     SERVICE_AREA: { $exists: true, $nin: ['', null] },
//     BRANCH: { $exists: true, $nin: ['', null] },
//     ID_TELEGRAM: { $exists: true, $nin: ['', null] }, // 🔥 FILTER DI SINI
//     LEVEL: { $in: ['HSA', 'Korlap', 'OSA', 'Officer 3'] }
//   })

//   const mapping = {}

//   data.forEach(user => {
//     if (!user.ID_TELEGRAM) return // 🔥 PASTIKAN ID_TELEGRAM ADA

//     console.log("cek LEVEL"); // 🔥 CEK DATA YANG DIPROSES
//     console.log(`User: ${user.NAMA}, Level: ${user.LEVEL}, HSA: ${user.SERVICE_AREA}, Branch: ${user.BRANCH}`); // 🔥 CEK DATA YANG DIPROSES
//     const hsa = (user.SERVICE_AREA || '').toUpperCase().trim()
//     const branch = (user.BRANCH || '').toUpperCase().trim()

//     if (!hsa || !branch) return

//     if (!mapping[hsa]) mapping[hsa] = []

//     mapping[hsa].push({
//       chatId: user.ID_TELEGRAM,
//       topic: user.ID_TOPIC_GRUP,
//       branch
//     })
//   })

//   return mapping
// }

// module.exports = { getPicMappingByHSA }
