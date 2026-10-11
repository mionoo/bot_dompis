// // //ttrb2b.service.js

// ttrb2b.service.js

const { fetchTicketsByBranches } = require("./ttrb2b.mongo");

const { analyzeTtrb2b } = require("./ttrb2b.analyzer");

const { buildTtrb2bMessage } = require("./ttrb2b.formatter");

const { sendGlobal, delay } = require("../../core/globalSender");

const { cariGrupB2BDariBranch, cariZONEBOTdariBranch } = require("./ttrb2b.db");

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
// RUN TTR B2B
// =========================

async function runTtrb2b(ctx) {
  try {
    // =========================
    // AMBIL BRANCH DARI MASTER DATA
    // =========================

    if (!branches.length) {
      console.log("Tidak ada branch ditemukan");

      return;
    }

    // =========================
    // NORMALIZE BRANCH
    // =========================

    const branchList = [
      ...new Set(branches.map((b) => normalizeBranch(b.name)).filter(Boolean)),
    ];

    console.log("TOTAL BRANCH:", branchList.length);
    console.log("BRANCH:", branchList);

    // =========================
    // BRANCH UNTUK QUERY DB
    // =========================

    const dbBranches = branchList;

    console.log("DB BRANCH:", dbBranches);

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

    for (const branch of branchList) {
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

      const analyzed = analyzeTtrb2b(branchTickets);

      if (!Object.keys(analyzed).length) {
        console.log(`Tidak ada tiket penting untuk ${branch}`);

        continue;
      }

      // =========================
      // BUILD MESSAGE
      // =========================

      let finalMessage = "";

      for (const hsa of Object.keys(analyzed)) {
        finalMessage += buildTtrb2bMessage(hsa, analyzed[hsa]);

        finalMessage += "\n━━━━━━━━━━━━━━━━━━\n\n";
      }

      // =========================
      // CARI SEMUA GRUP B2B BRANCH
      // =========================

      const grupList = await cariGrupB2BDariBranch(branch);

      if (!grupList.length) {
        console.log(`❌ Grup B2B tidak ditemukan: ${branch}`);
        continue;
      }

      console.log(`GRUP B2B ${branch}: ${grupList.length} grup`);

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

        console.log(`✅ TTR B2B ${branch} terkirim ke ${grup.NAMA_GRUP}`);

        await delay(300);
      }
    }
  } catch (err) {
    console.error("ERROR runTtrb2b:", err);
  }
}

module.exports = {
  runTtrb2b,
};
