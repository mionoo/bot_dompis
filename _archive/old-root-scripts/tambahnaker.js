const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");

const { Nakers } = require("./models/users"); // sesuaikan path model kamu

// koneksi mongo
//mongoose.connect("mongodb://127.0.0.1:27017/bot_TA");
mongoose.connect(process.env.MONGO_URI);


const results = [];

async function importCSV() {
  try {
    const filePath = path.join(__dirname, "updateData.csv");

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", async () => {
        console.log(`📦 Total data CSV: ${results.length}`);

        let inserted = 0;
        let skipped = 0;

        for (const row of results) {
          try {
            // bersihkan NIK
            const nik = String(row.NIK || "").trim();

            if (!nik) {
              console.log("⚠️ NIK kosong, skip");
              continue;
            }

            // cek apakah NIK sudah ada
            const existing = await Nakers.findOne({ NIK: nik });

            if (existing) {
              skipped++;
              console.log(`⏭️ NIK sudah ada: ${nik}`);
              continue;
            }

            // insert data baru
            await Nakers.create({
              POSITION_NAME: row.POSITION_NAME || "",
              POSITION_TITLE: row.POSITION_TITLE || "",
              NIK: nik,
              NAMA: row.NAMA || "",
              SERVICE_AREA: row.SERVICE_AREA || "",
              BRANCH: row.BRANCH || "",
              REGIONAL: row.REGIONAL || "",
              AREA: row.AREA || "",
              LEVEL: row.LEVEL || "",
              SEKTOR: row.SEKTOR || "",
              ID_TELEGRAM: row.ID_TELEGRAM || "",
              LABOUR: row.LABOUR || "",
            });

            inserted++;
            console.log(`✅ Inserted: ${nik}`);
          } catch (err) {
            console.log("❌ Error row:", err.message);
          }
        }

        console.log("\n====================");
        console.log(`✅ Inserted : ${inserted}`);
        console.log(`⏭️ Skipped  : ${skipped}`);
        console.log("====================\n");

        mongoose.connection.close();
      });
  } catch (error) {
    console.log("❌ ERROR:", error);
  }
}

importCSV();
