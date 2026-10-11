// modules/segmentasiTiket/segmentasi.clear.js

const {
  SegmentTickets,
  AllTickets,
} = require("../../models/dompis");

// =========================
// CLEAR SEGMENT TICKETS
// =========================

async function clearSegmentTickets() {
  try {
    const result =
      await SegmentTickets.deleteMany({});

    console.log(
      `🗑️ ${result.deletedCount} data segment_tickets dihapus`
    );
  } catch (err) {
    console.log(
      "❌ Gagal hapus segment_tickets:",
      err.message
    );
  }
}

// =========================
// CLEAR ALL TICKETS
// =========================

async function clearAllTickets() {
  try {
    const result =
      await AllTickets.deleteMany({});

    console.log(
      `🗑️ ${result.deletedCount} data all_tickets dihapus`
    );
  } catch (err) {
    console.log(
      "❌ Gagal hapus all_tickets:",
      err.message
    );
  }
}

module.exports = {
  clearSegmentTickets,
  clearAllTickets,
};