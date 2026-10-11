// naker.controller.js
const { findNaker } = require("./naker.service");




async function nakerCommand(ctx, args) {
  const nik = Number(args[0]);

  if (isNaN(nik)) {
    return ctx.reply("NIK harus angka");
  }

  const data = await findNaker(nik);

  if (!data) {
    return ctx.reply("❌ Data tidak ditemukan");
  }

  return ctx.reply(formatNaker(data));
}

function formatNaker(data) {
  return `
👤 Data Teknisi

POSITION_NAME  :${data.POSITION_NAME}
POSITION_TITLE :${data.POSITION_TITLE}
NIK            :${data.NIK}
NAMA           :${data.NAMA}
SEKTOR         :${data.SEKTOR}
RAYON          :${data.RAYON}
SERVICE_AREA   :${data.SERVICE_AREA}
BRANCH         :${data.BRANCH}
REGIONAL       :${data.REGIONAL}
AREA           :${data.AREA}
LEVEL          :${data.LEVEL}
LABOUR         :${data.LABOUR}
ID_TELEGRAM    :${data.ID_TELEGRAM}
`;
}

module.exports = { nakerCommand, formatNaker };
