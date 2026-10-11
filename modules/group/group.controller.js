//group.controller.js

const { Markup } = require("telegraf");
const {
  findGroupByWorkzone,
  findIdGroupBySA,
  findGrupReport,
  findGrupOrder,
} = require("./group.service");
//const { runTTR } = require('../modules/ttr/ttr.service');


async function cekWorkzoneCommand(ctx, args) {
  try {
    const workzone = args[0]?.trim().toUpperCase();

    if (!workzone) {
      return ctx.reply("Gunakan format: /cekworkzone BKL");
    }

    const data = await findGroupByWorkzone(workzone);
    // console.log(data)
    const sa = data[0].SERVICE_AREA;
    const idgrupe = await findIdGroupBySA(sa);
  
    if (!data || Object.keys(data).length === 0) {
      return ctx.reply("❌ Workzone tidak ditemukan");
    }

    if (!idgrupe || Object.keys(idgrupe).length === 0) {
      return ctx.reply("❌ ID GRUP TIDAK DITEMUKAN");
    }

    return ctx.reply(formatGroup(data, idgrupe));
  } catch (err) {
    console.error(err);
    return ctx.reply("⚠️ Terjadi kesalahan sistem");
  }
}

function formatGroup(data, idgrupe) {
  return `
📍 Data Group

Workzone: ${data[0].WORKZONE}
Service Area: ${data[0].SERVICE_AREA}
Branch: ${data[0].BRANCH}
Region TSEL: ${data[0].REGION_TSEL}
id GRUP : ${idgrupe[0].ID_GRUP}
Topic Grup : ${idgrupe[0].ID_TOPIC_GRUP}
Nama Topic Grup : ${idgrupe[0].NAMA_SUB_TOPIC}
Nama Grup : ${idgrupe[0].NAMA_GRUP}
`;
}

// async function setGroupCommand(ctx) {
//   return ctx.reply(
//     "Pilih jenis group:",
//     Markup.inlineKeyboard([
//       [
//         Markup.button.callback("📦 ORDER", "SET_GROUP_ORDER"),
//         Markup.button.callback("📊 REPORT", "SET_GROUP_REPORT"),
//       ],
//     ]),
//   );
// }


module.exports = { cekWorkzoneCommand,
   //setGroupCommand 
  };
