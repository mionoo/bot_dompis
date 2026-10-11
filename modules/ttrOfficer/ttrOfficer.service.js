//ttrOfficer.service.js

const { fetchTicketsByBranches } = require("./ttrOfficer.mongo");

const { analyzeTtrOfficer } = require("./ttrOfficer.analyzer");
const { buildTtrOfficerMessage } = require("./ttrOfficer.formatter");
const { sendWithSplit } = require("../ttr/ttr.sender");

const { findOfficer } = require("../naker/naker.service");
//const { fetchReportsByAreas } = require("../ttr/ttr.service");

const { sendGlobal, delay } = require("../../core/globalSender");
const { cariZONEBOTdariBranch } = require("./ttrOfficer.db");

function extractArea(branch) {
  return branch.replace(/branch\s*/i, "").trim();
}
async function runTtrOfficer(ctx) {
  try {
   // const { fetchReportsByAreas } = require("../ttr/ttr.service");
    // 🔹 Ambil data officer
    const officers = await findOfficer();
   // console.log("OFFICER:", officers);

    if (!officers.length) {
      console.log("Tidak ada officer ditemukan");
      return;
    }

    function normalizeBranch(branch = "") {
  return branch
    .replace(/^AREA\s*/i, "")
    .replace(/^BRANCH\s*/i, "")
    .trim()
    .toUpperCase();
}

    // 🔹 Ambil area unik
    const areas = [...new Set(officers.map((o) => extractArea(o.BRANCH)))];

    // 🔹 Ambil tiket
    const branches = [
      ...new Set(officers.map((o) => (o.BRANCH || "").toUpperCase().trim())),
    ];

  //  console.log("BRANCHES:", branches);

    const tickets = await fetchTicketsByBranches(branches);
   // console.log("TOTAL TICKETS:", tickets.length);

    if (!tickets.length) {
      console.log("Tidak ada tiket");
      return;
    }

    // 🔁 Loop tiap officer
    for (const officer of officers) {
      const branch = normalizeBranch(officer.BRANCH)

      // console.log(
      //   `PROSES: ${officer.NAMA} | ${officer.ID_TELEGRAM} | ${branch}`,
      // );

      // 🔹 Filter tiket sesuai branch
      const branchTickets = tickets.filter(
  t => normalizeBranch(t.branchArea) === branch
)
      if (!branchTickets.length) {
       // console.log(`Tidak ada tiket untuk branch ${branch}`);
        continue;
      }

      // 🔹 Analyze (filter SLA & kondisi officer)
      const analyzed = analyzeTtrOfficer(branchTickets);

      if (!Object.keys(analyzed).length) {
        console.log(`Tidak ada tiket lolos filter untuk ${branch}`);
        continue;
      }

      // 🔹 Build message per HSA
      let finalMessage = "";

      for (const hsa of Object.keys(analyzed)) {
        finalMessage += buildTtrOfficerMessage(hsa, analyzed[hsa]);
        finalMessage += "\n━━━━━━━━━━━━━━━━━━\n\n";
      }


      
      const zone = await cariZONEBOTdariBranch(branch);
     // console.log(zone);

     await sendGlobal({
        zone: zone,
        chatId: officer.ID_TELEGRAM,
         message: finalMessage,
         topic: officer.ID_TOPIC_GRUP,
       });

      // 🔹 Kirim ke Telegram
      // await sendWithSplit(
      //   ctx,
      //   officer.ID_TELEGRAM,
      //   finalMessage,
      //   officer.ID_TOPIC_GRUP
      // )

      console.log(`✅ Terkirim ke ${officer.NAMA}`);
// =========================
  // DELAY 500ms
  // =========================
  await delay(300);
    }
  } catch (err) {
    //console.error("ERROR runTtrOfficer:", err);
  }
}

module.exports = { runTtrOfficer };
