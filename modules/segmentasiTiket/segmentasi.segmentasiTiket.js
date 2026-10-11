// models/segmentasiTiket/segmentasi.segmentasiTiket.js

const mongoose = require("mongoose");

const segmentTicketSchema =
  new mongoose.Schema(
    {
      incident: {
        type: String,
        unique: true,
        index: true,
      },

      reported_date: {
        type: Date,
        default: null,
      },

      booking_date: {
        type: Date,
        default: null,
      },

      workzone: {
        type: String,
        default: null,
      },

      service_no: {
        type: String,
        default: null,
      },

      service_type: {
        type: String,
        default: null,
      },

      jenis_tiket: {
        type: String,
        default: null,
      },

      status: {
        type: String,
        default: null,
      },

      guarantee_status: {
        type: String,
        default: null,
      },

      SERVICE_AREA: {
        type: String,
        default: null,
      },

      BRANCH: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
      collection: "segment_tickets",
    }
  );

module.exports =
  mongoose.models.segment_tickets ||
  mongoose.model(
    "segment_tickets",
    segmentTicketSchema
  );
