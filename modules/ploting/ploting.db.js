// //ploting.db.js

const { Nakers } = require("../../models/users");

const { Groups } = require("../../models/group");

const { Idgrups } = require("../../models/idgrupTelegram");

const { DataEventDompis } = require("../../models/dompis");

async function eventDataDompis(tiket) {
  return await DataEventDompis.findOne({ tiket }).lean();
}

// ======================================================
// NIK → NAKER
// ======================================================

async function cariNakerDariNIK(nik) {
  return await Nakers.findOne({ NIK: nik }).lean();
}

// ======================================================
// WORKZONE → SA
// ======================================================

async function dariWorkZoneCariSA(workzone) {
  return await Groups.findOne({ WORKZONE: workzone }).lean();
}

// ======================================================
// SA → GRUP
// ======================================================

async function dariSAcariIdGrup(sa) {
  return await Idgrups.findOne({
    SERVICE_AREA: sa,
  }).lean();
}

// ======================================================
// SA → BOT
// ======================================================

async function dariSACariZONEBOT(SA) {
  const data = await Groups.findOne({
    SERVICE_AREA: SA,
  }).lean();

  return data ? data.ZONEBOT : null;
}

// ======================================================
// SA → MULTIPLE GROUP
// ======================================================

async function cariGrupDariSA(sa, type) {
  return await Idgrups.find({
    SERVICE_AREA: sa,
    TIPE_GRUP: type,
    STATUS: "ACTIVE",
  }).lean();
}

module.exports = {
  cariNakerDariNIK,
  dariWorkZoneCariSA,
  dariSAcariIdGrup,
  cariGrupDariSA,
  dariSACariZONEBOT,
  eventDataDompis,
};

// const { cariNakers, Nakers } = require("../../models/users");
// const { cariGroups, Groups } = require("../../models/group");
// const { Idgrups } = require("../../models/idgrupTelegram"); // 🔥 ganti ini
// const { EventDompisLog, DataEventDompis } = require("../../models/dompis");

// async function eventDataDompis(tiket) {
//   return await DataEventDompis.findOne({ tiket }).lean();
// }
// // 🔥 japri teknisi
// async function cariNakerDariNIK(nik) {
//   return await Nakers.findOne({ NIK: nik }).lean();
// }

// // 🔥 workzone → SA
// async function dariWorkZoneCariSA(workzone) {
//   return await Groups.findOne({ WORKZONE: workzone }).lean();
// }

// // 🔥 SA → 1 grup
// async function dariSAcariIdGrup(sa) {
//   return await Idgrups.findOne({ SERVICE_AREA: sa }).lean();
// }

// async function dariSACariZONEBOT(SA) {
//   const data = await Groups.findOne({ SERVICE_AREA: SA }).lean();
//   return data ? data.ZONEBOT : null;
// }

// // 🔥 SA → banyak grup (ORDER / REPORT / KAWAL)
// async function cariGrupDariSA(sa, type) {
//   return await Idgrups.find({
//     SERVICE_AREA: sa,
//     TIPE_GRUP: type,
//     STATUS: "ACTIVE", // 🔥 penting
//   }).lean();
// }

// //cek
// module.exports = {
//   cariNakerDariNIK,
//   dariWorkZoneCariSA,
//   dariSAcariIdGrup,
//   cariGrupDariSA,
//   dariSACariZONEBOT,
//   eventDataDompis,
// };
