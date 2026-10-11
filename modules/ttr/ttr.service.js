//ttr.service.js

const { analyzeTTR } = require("./ttr.analyzer");
const { buildTTRMessage } = require("./ttr.formatter");
const { sendWithSplit } = require("./ttr.sender");
const { findGrupReport, findGrupOrder } = require("../group/group.service");
const { getSheetData } = require("../../adapters/gsheetTTRArea3");
const { sendGlobal, delay} = require("../../core/globalSender");
const { dariSACariZONEBOT } = require("./ttr.db");
const { fetchTicketsByServiceAreas } = require("./ttr.mongo");

// mapper
function mapSheet(rows, area) {
  if (!rows || rows.length <= 1) return [];

  const [header, ...data] = rows;

  return data.map((row) => ({
    TIKET: row[0] || "",
    REPORTED_DATE: row[1] || "",
    STO: row[2] || "",
    ND: row[3] || "",
    SERVICE_TYPE: row[4] || "",
    BOOKING_DATE: row[5] || "",
    UMUR: row[6] || "",
    SEGMEN: row[7] || "",
    STATUS_FFG: row[8] || "",
    DURASI: row[9] || "",
    HSA: row[10] || "",
    FLAGGING_TEKNISI: row[11] || "",
    FLAGGING_PICKUP: row[12] || "",
    branchArea: area,
  }));
}


function extractArea(branch) {
  return branch.replace(/branch\s*/i, "").trim();
}





async function runTTR(ctx) {
  try {
    const groups = await findGrupOrder();

    if (!groups.length) {
      console.log("❌ Tidak ada grup");
      return;
    }

    // ambil semua SA unik
    const serviceAreas = [
      ...new Set(
        groups.map((g) =>
          (g.SERVICE_AREA || "").toUpperCase().trim()
        )
      ),
    ];

    console.log("SERVICE AREAS:", serviceAreas);

    // 🔥 ambil tiket dari Mongo
    const tickets =
      await fetchTicketsByServiceAreas(serviceAreas);

    console.log(`✅ Total tiket: ${tickets.length}`);

    const grouped = analyzeTTR(tickets);

    for (const group of groups) {
      const serviceArea =
        (group.SERVICE_AREA || "")
          .toUpperCase()
          .trim();

      const list = grouped[serviceArea];

      if (!list || !list.length) {
        console.log(
          `❌ Tidak ada tiket untuk ${serviceArea}`
        );
        continue;
      }

      const zone =
        await dariSACariZONEBOT(serviceArea);

      console.log(
        `✅ ${list.length} tiket untuk ${serviceArea}`
      );

      const message =
        buildTTRMessage(serviceArea, list);
	//console.log(message);
      await sendGlobal({
         zone: zone,
         chatId: group.ID_GRUP,
         message: message,
         topic: group.ID_TOPIC_GRUP,
       });
       await delay(500);
    }


  } catch (err) {
    console.error("❌ runTTR error:", err);
  }
}




module.exports = { runTTR };
