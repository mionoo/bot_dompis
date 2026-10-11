//ttrb2b.db.js
const { cariNakers, Nakers } = require("../../models/users");
const { cariGroups, Groups } = require("../../models/group");
const { Idgrups, Idgrupb2b } = require("../../models/idgrupTelegram"); // 🔥 ganti ini
const { BOT_ALLOCATION } = require("../branch/branch.data");

// 🔥 japri teknisi
async function cariNakerDariNIK(nik) {
  return await Nakers.findOne({ NIK: nik }).lean();
}

// 🔥 workzone → SA
async function dariWorkZoneCariSA(workzone) {
  return await Groups.findOne({ WORKZONE: workzone }).lean();
}

// 🔥 SA → 1 grup
async function dariSAcariIdGrup(sa) {
  return await Idgrups.findOne({ SERVICE_AREA: sa }).lean();
}

async function dariSACariZONEBOT(SA) {
  const data = await Groups.findOne({ SERVICE_AREA: SA }).lean();
  return data ? data.ZONEBOT : null;
}

async function cariZONEBOTdariBranch(branch) {
  const data = await Groups.findOne({ BRANCH: branch }).lean();
  return data ? data.ZONEBOT : null;
}

// 🔥 SA → banyak grup (ORDER / REPORT / KAWAL)
async function cariGrupDariSA(sa, type) {
  return await Idgrups.find({
    SERVICE_AREA: sa,
    TIPE_GRUP: type,
    STATUS: "ACTIVE", // 🔥 penting
  }).lean();
}

async function cariGrupB2BDariBranch(branch) {
  return await Idgrupb2b.find({
    BRANCH: branch,
    STATUS: "ACTIVE",
  }).lean();
}


//cek
module.exports = {
  cariNakerDariNIK,
  dariWorkZoneCariSA,
  dariSAcariIdGrup,
  cariGrupDariSA,
  dariSACariZONEBOT,
  cariZONEBOTdariBranch,
  cariGrupB2BDariBranch,
};
