// scripts/cekdataevent.js
//
// Utility debug untuk mengecek data event Dompis di MongoDB.
// Jalankan dari root project: `node scripts/cekdataevent.js`

require("dotenv").config();

const mongoose = require("mongoose");

const { eventDataDompis } = require("../modules/ploting/ploting.db");
const { DataEventDompis } = require("../models/dompis");

async function main() {
  try {
    // Sebelumnya connection string localhost tertulis langsung di kode;
    // sekarang pakai MONGO_URI dari .env yang sama dengan aplikasi utama,
    // dengan fallback ke localhost supaya tetap jalan untuk dev cepat.
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/bot_TA");

    console.log("✅ Mongo Connected");

    const total = await DataEventDompis.countDocuments();
    console.log("Total data:", total);

    const data = await eventDataDompis("INC48949987");
    console.log(data);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
