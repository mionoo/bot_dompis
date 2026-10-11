// dompis.js
const mongoose = require("mongoose");



const logEventSchema = new mongoose.Schema({
  waktu: String,
  raw: mongoose.Schema.Types.Mixed,
});

const EventDompisLog = mongoose.model("EventDompisLog", logEventSchema);

// 🔥 event yang sudah diparsing
const eventSchema = new mongoose.Schema({
  eventId: { type: String, unique: true }, // 🔥 penting
  type: String,
  waktu: String,
  nik: String,
  namateknisi: String,
  tiket: String,
  noServi: String,
  workzone: String,
  admin: String,
});

const DataEventDompis = mongoose.model("DataEventDompis", eventSchema);

// Riwayat pengiriman Telegram per tujuan. Satu event dapat menghasilkan
// beberapa dokumen, misalnya ke teknisi dan beberapa grup REPORT/KAWAL.
const telegramDeliveryLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, index: true },
    incident: { type: String, index: true },
    eventType: String,
    deliveryType: { type: String, enum: ["MESSAGE", "EVIDENCE"] },
    targetType: {
      type: String,
      enum: ["TECHNICIAN", "KAWAL_GROUP", "REPORT_GROUP", "SYSTEM"],
    },
    chatId: String,
    topicId: Number,
    zone: String,
    status: { type: String, enum: ["SENT", "FAILED", "SKIPPED"], index: true },
    reasonCode: String,
    reason: String,
    telegramErrorCode: Number,
    telegramErrorDescription: String,
    itemsSent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

telegramDeliveryLogSchema.index({ incident: 1, status: 1, createdAt: -1 });
telegramDeliveryLogSchema.index({ status: 1, createdAt: -1 });

const TelegramDeliveryLog = mongoose.model(
  "TelegramDeliveryLog",
  telegramDeliveryLogSchema,
);

const regulerTicketSchema = new mongoose.Schema(
  {
    incident: {
      type: String,
      unique: true,
    },

    branch_name: String,

    reported_date: Date,

    service_area: String,

    service_no: String,

    service_type: String,

    booking_date: Date,

    jenis_tiket_1: String,

    jenis_tiket_2: String,

    guarantee_status: String,

    area: String,

    teknisi: String,

    status_update: String,
  },
  {
    timestamps: true,
  },
);

const RegulerTickets = mongoose.model("RegulerTickets", regulerTicketSchema);

const SegmentTicketsSchema = new mongoose.Schema(
  {
    incident: {
      type: String,
      unique: true,
    },

    BRANCH: String,

    SERVICE_AREA: String,

    booking_date: Date,

    guarantee_status: String,

    jenis_tiket: String,

    reported_date: Date,

    service_no: String,

    service_type: String,

    status: String,

    workzone: String,
  },
  {
    timestamps: true,
  },
);

const SegmentTickets = mongoose.model("segment_tickets", SegmentTicketsSchema);



// ALL TICKETS
// =========================

const allTicketsSchema =
  new mongoose.Schema(
    {},
    {
      strict: false,
      collection: "all_tickets",
      timestamps: true,
    }
  );

const AllTickets =
  mongoose.models.all_tickets ||
  mongoose.model(
    "all_tickets",
    allTicketsSchema
  );


module.exports = {
  EventDompisLog,
  DataEventDompis,
  TelegramDeliveryLog,
  RegulerTickets,
  SegmentTickets,
  AllTickets
};
