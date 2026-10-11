// // //ttrb2b.service.js

const { fetchTicketsByBranches } = require("./ttrHD.mongo");

const { analyzeTtrHD } = require("./ttrHD.analyzer");

const { buildTtrHDMessage } = require("./ttrHD.formatter");

const { sendGlobal, delay } = require("../../core/globalSender");

const {
  cariGrupB2BDariBranch,
  cariZONEBOTdariBranch,
  cariGrupHDDariBranch,
} = require("./ttrHD.db");

const { branches } = require("../branch/branch.data");

// =========================
// NORMALIZE BRANCH
// =========================

function normalizeBranch(branch = "") {
  return branch
    .replace(/^AREA\s*/i, "")
    .replace(/^BRANCH\s*/i, "")
    .trim()
    .toUpperCase();
}

// =========================
// RUN TTR HD
// =========================

async function runTtrHD(ctx) {
  try {
    // =========================
    // AMBIL BRANCH DARI MASTER DATA
    // =========================

    if (!branches.length) {
      console.log("Tidak ada branch ditemukan");
      return;
    }

    console.log("TOTAL BRANCH:", branches.length);

    console.log(
      "BRANCH:",
      branches.map((b) => b.name),
    );

    // =========================
    // BRANCH UNTUK QUERY DB
    // =========================

    // const dbBranches = branches.map((b) => b.name);
    const dbBranches = branches.map((b) => normalizeBranch(b.name));

    // =========================
    // AMBIL SEMUA TIKET
    // =========================

    const tickets = await fetchTicketsByBranches(dbBranches);

    console.log("TOTAL TICKETS:", tickets.length);

    if (!tickets.length) {
      console.log("Tidak ada tiket");
      return;
    }

    // =========================
    // LOOP PER BRANCH
    // =========================

    for (const branchData of branches) {
      const branch = normalizeBranch(branchData.name);

      console.log(`\n========== ${branch} ==========`);

      // =========================
      // FILTER TIKET BRANCH
      // =========================

      const branchTickets = tickets.filter(
        (t) => normalizeBranch(t.branchArea) === branch,
      );

      if (!branchTickets.length) {
        console.log(`Tidak ada tiket untuk ${branch}`);
        continue;
      }

      console.log(`${branch} : ${branchTickets.length} tiket`);

      // =========================
      // ANALYZE SLA
      // =========================

      const analyzed = analyzeTtrHD(branchTickets);

      if (!Object.keys(analyzed).length) {
        console.log(`Tidak ada tiket penting untuk ${branch}`);

        continue;
      }

      // =========================
      // BUILD MESSAGE
      // =========================

      let finalMessage = "";

      for (const hsa of Object.keys(analyzed)) {
        finalMessage += buildTtrHDMessage(hsa, analyzed[hsa]);

        finalMessage += "\n━━━━━━━━━━━━━━━━━━\n\n";
      }

      // =========================
      // CARI GRUP HD BRANCH
      // =========================

      // =========================
      // CARI SEMUA GRUP HD BRANCH
      // =========================

      const grupList = await cariGrupHDDariBranch(branch);

      if (!grupList.length) {
        console.log(`❌ Grup HD tidak ditemukan: ${branch}`);
        continue;
      }

      console.log(`GRUP HD ${branch}: ${grupList.length} grup`);

      // =========================
      // CARI BOT
      // =========================

      const zone = await cariZONEBOTdariBranch(branch);

      if (!zone) {
        console.log(`❌ BOT tidak ditemukan untuk ${branch}`);
        continue;
      }

      console.log(`BOT ${branch}:`, zone);

      // =========================
      // KIRIM KE SEMUA GRUP HD
      // =========================

      for (const grup of grupList) {
        console.log(
          `KIRIM ${branch}:`,
          grup.NAMA_GRUP,
          grup.ID_GRUP,
          grup.ID_TOPIC_GRUP,
        );

        await sendGlobal({
          zone,
          chatId: grup.ID_GRUP,
          message: finalMessage,
          topic: grup.ID_TOPIC_GRUP,
        });

        console.log(`✅ TTR HD ${branch} terkirim ke ${grup.NAMA_GRUP}`);

        await delay(300);
      }
    }
  } catch (err) {
    console.error("ERROR runTtrHD:", err);
  }
}

module.exports = {
  runTtrHD,
};
