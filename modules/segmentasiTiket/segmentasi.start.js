// segmentasi.start.js

require("dotenv").config();

const connectDB =
  require("../../config/db");

const processTickets =
  require("./segmentasi.process.Ticket");

async function jalanSegmentasi() {

  await connectDB();

  await processTickets();


}

module.exports = { jalanSegmentasi };