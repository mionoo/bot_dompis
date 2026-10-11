const { SegmentTickets , DataEventDompis} = require("../../models/dompis");

async function fetchTicketsByServiceAreas(serviceAreas = []) {
  try {
    if (!serviceAreas.length) return [];

    // Ambil semua tiket
    const tickets = await SegmentTickets.find({
      SERVICE_AREA: {
        $in: serviceAreas,
      },
      status: {
        $in: ["OPEN", "ANALYSIS", "BACKEND", "DRAFT", "PENDING", "RESOLVED"],
      },
    }).lean();

    //console.log("TOTAL TICKETS:", tickets.length);

    if (!tickets.length) return [];

    // Ambil semua nomor tiket
    const incidents = tickets.map((t) => t.incident);

    // Ambil semua event yang terkait tiket
    const events = await DataEventDompis.find({
      tiket: { $in: incidents },
    }).lean();

   // console.log("TOTAL EVENTS:", events.length);

    // Buat mapping tiket -> event
    const eventMap = new Map();

    for (const event of events) {
      const current = eventMap.get(event.tiket);

      if (!current) {
        eventMap.set(event.tiket, event);
        continue;
      }

      const currentTime = new Date(current.waktu).getTime();
      const eventTime = new Date(event.waktu).getTime();

      if (eventTime > currentTime) {
        eventMap.set(event.tiket, event);
      }
    }

    return tickets.map((t) => {
      const lastEvent = eventMap.get(t.incident);

     // console.log(lastEvent?.namateknisi || "", "untuk tiket", t.incident);

      return {
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

        FLAGGING_TEKNISI: lastEvent?.namateknisi || "",

        // ambil nama teknisi dari event dompis
        // FLAGGING_PICKUP: event?.namateknisi || "",
        // FLAGGING_PICKUP: lastEvent?.namateknisi || "",
        FLAGGING_PICKUP: "",
        branchArea: t.BRANCH || "",
      };
    });
  } catch (err) {
    console.error("❌ fetchTicketsByServiceAreas:", err);
    return [];
  }
}

function mappingSegmen(t) {
  return t.jenis_tiket;
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
  fetchTicketsByServiceAreas,
};
