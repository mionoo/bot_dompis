const mongoose = require("mongoose");

const { eventDataDompis } = require("./modules/ploting/ploting.db");
const { DataEventDompis } = require("./models/dompis");

async function main() {
  try {
    await mongoose.connect("mongodb://localhost:27017/bot_TA");

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