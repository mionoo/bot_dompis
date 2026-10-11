//hookDompis.cekDb.js
const { cariNakers, Nakers } = require("../../models/users");
const { cariGroups, Groups } = require("../../models/group");
const { Idgrups, idgrupKawal } = require("../../models/idgrupTelegram"); // 🔥 ganti ini
const {
  EventDompisLog,
  DataEventDompis,
  TelegramDeliveryLog,
} = require("../../models/dompis");


function getNowWIB() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta"
  });
}



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

// 🔥 SA → banyak grup (ORDER / REPORT / KAWAL)
async function cariGrupDariSA(sa, type) {
  return await Idgrups.find({
    SERVICE_AREA: sa,
    TIPE_GRUP: type,
    STATUS: "ACTIVE", // 🔥 penting
  }).lean();
}

async function cariGrupKawaldariBranch(branch) {
  return await idgrupKawal
    .find({
      BRANCH: branch,
      TIPE_GRUP: "KAWAL",
      STATUS: "ACTIVE", // 🔥 penting
    })
    .lean();
}

async function saveEventDompis(data) {
  const result = await DataEventDompis.findOneAndUpdate(
    { eventId: data.eventId },
    { $setOnInsert: data }, // 🔥 hanya insert kalau belum ada
    { upsert: true, new: false } // 🔥 penting
  );

  // 🔥 kalau result != null → data SUDAH ADA
  if (result) {
    return { isDuplicate: true };
  }

  return { isDuplicate: false };
}

// 🔥 simpan raw webhook
//async function saveLogDompis({ getNowWIB, events }) {
//  return await EventDompisLog.create({
//    waktu: getNowWIB(),
//    raw: events, // simpan semua event
//  });
//}

//async function saveLogDompis({ events }) {
//  return await EventDompisLog.create({
//    waktu: getNowWIB(),
//    raw: events,
//  });
//}

async function saveLogDompis({ raw, waktu }) {
  return await EventDompisLog.create({
    waktu,
    raw,
  });
}

async function saveTelegramDeliveryLog(data) {
  try {
    return await TelegramDeliveryLog.create(data);
  } catch (err) {
    // Logging tidak boleh menghentikan pemrosesan webhook atau pengiriman lain.
    console.error("❌ Gagal menyimpan TelegramDeliveryLog:", err.message);
    return null;
  }
}





//cek
module.exports = {
  cariNakerDariNIK,
  dariWorkZoneCariSA,
  dariSAcariIdGrup,
  cariGrupDariSA,
  cariGrupKawaldariBranch,
  saveEventDompis,
  saveLogDompis,
  saveTelegramDeliveryLog,
};
