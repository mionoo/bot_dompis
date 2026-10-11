//ttrofficer.mongo.js

const { SegmentTickets } = require("../../models/dompis");

async function fetchTicketsByBranches(branches = []) {
  try {
    if (!branches.length) return [];

    const tickets = await SegmentTickets.find({
      BRANCH: {
        $in: branches,
      },

      status: {
        $in: [
          "OPEN",
          "ANALYSIS",
          "BACKEND",
          "DRAFT",
          "PENDING",
          "RESOLVED",
        ],
      },
    }).lean();

    console.log("TOTAL TICKETS DB:", tickets.length);

    return tickets.map((t) => ({
      TIKET: t.incident || "-",

      REPORTED_DATE: t.reported_date || null,

      STO: t.workzone || "-",

      ND: t.service_no || "-",

      SERVICE_TYPE: t.jenis_tiket || "-",

      BOOKING_DATE: t.booking_date || null,

      UMUR: "",

      SEGMEN: mappingSegmen(t),

      STATUS_FFG: t.guarantee_status || "",

      DURASI: "",

      HSA: (t.SERVICE_AREA || "").toUpperCase(),

      FLAGGING_TEKNISI: "",

      FLAGGING_PICKUP: "",

      branchArea: (t.BRANCH || "").toUpperCase(),
    }));

  } catch (err) {
    console.error("❌ fetchTicketsByBranches:", err.message);
    return [];
  }
}

function mappingSegmen(t) {
  return (t.jenis_tiket)
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

module.exports = {
  fetchTicketsByBranches,
};
