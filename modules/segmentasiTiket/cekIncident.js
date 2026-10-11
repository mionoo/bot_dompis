const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

console.log("ENV :", path.resolve(__dirname, "../../.env"));
console.log("MONGO_URI :", process.env.MONGO_URI);

const connectDB = require("./segmentasi.database");
const AllTickets = require("./segmentasi.allTiket");
const { classifyTicket } = require("./segmentasi.classify.Ticket");

(async () => {
  await connectDB();

  const incident = process.argv[2];

  if (!incident) {
    console.log("Usage:");
    console.log("node cekIncident.js INC50560252");
    process.exit();
  }

  const ticket = await AllTickets.findOne({
    incident: incident.trim(),
  }).lean();

  if (!ticket) {
    console.log("❌ Incident tidak ditemukan");
    process.exit();
  }

  const jenis_tiket = classifyTicket(ticket);

  console.log("==================================");
  console.log("Incident     :", ticket.incident);
  console.log("Status       :", ticket.status);
  console.log("Source       :", ticket.source_ticket);
  console.log("Flag         :", ticket.classification_flag);
  console.log("Path         :", ticket.classification_path);
  console.log("Owner Group  :", ticket.owner_group);
  console.log("Customer     :", ticket.customer_type);
  console.log("----------------------------------");
  console.log("Jenis Tiket  :", jenis_tiket);
  console.log("==================================");

  process.exit();
})();