//ploting.runner.js

const { analyzePloting } = require("./ploting.analyzer");
const { buildMessagePloting } = require("./ploting.formatter");
const { sendWithSplit } = require("../ttr/ttr.sender");

const { getPicMappingByHSA } = require("./ploting.service");

const { fetchTicketsByServiceAreas } = require("./ploting.mongo");
const { findGrupReport, findGrupOrder } = require("../group/group.service");

const { sendGlobal , delay} = require("../../core/globalSender");
const { dariSACariZONEBOT } = require("./ploting.db");



async function runPloting(ctx) {
  try {

    const mapping = await getPicMappingByHSA();

    if (!Object.keys(mapping).length) {
      console.log("❌ Tidak ada mapping");
      return;
    }

    const serviceAreas = Object.keys(mapping);

    const tickets =
      await fetchTicketsByServiceAreas(serviceAreas);

    if (!tickets.length) {
      console.log("❌ Tidak ada tiket");
      return;
    }

    const grouped = analyzePloting(tickets);

    for (const hsa of Object.keys(grouped)) {

      const tiketList = grouped[hsa];
      const users = mapping[hsa];

      if (!users?.length) continue;

      const zone =
        await dariSACariZONEBOT(hsa);

      const message =
        buildMessagePloting(hsa, tiketList);

      for (const user of users) {

        await sendGlobal({
          zone,
          chatId: user.chatId,
          topic: user.topic,
          message
        });

        await delay(300);

      }
     // await delay(300);

      console.log(
        `✅ ${hsa} terkirim ke ${users.length} naker`
      );
    }

  } catch (err) {
    console.error(err);
  }
}




module.exports = { runPloting };
