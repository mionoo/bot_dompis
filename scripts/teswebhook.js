// scripts/teswebhook.js
//
// Utility manual test untuk mengirim payload dummy ke endpoint webhook Dompis.
// Jalankan dari root project: `node scripts/teswebhook.js`
// (pastikan server index.js sedang jalan di local dulu)

require("dotenv").config();

const axios = require("axios");

// Bisa dioverride lewat .env (TEST_WEBHOOK_URL / TECH_EVENTS_WEBHOOK_SECRET)
// tanpa mengubah kode; fallback ke nilai lama untuk dev cepat.
const URL = process.env.TEST_WEBHOOK_URL || "http://localhost:3031/webhook/dompis";
const SECRET = process.env.TECH_EVENTS_WEBHOOK_SECRET || "bot12345678";

// 🔥 generator event biar fleksibel
function createEvent(status = "PENDING") {
  return {
    actor: {
      role: "teknisi",
      id_user: 100,
    },
    admin: {
      nama: "SAMSUL ARIFIN",
      action: status === "ASSIGNED" ? "ASSIGNED" : "UPDATE",
    },
    status: {
      rca: null,
      sub_rca: null,
      evidence: {
        count: 2,
        files: [
          {
            file_name: `${status.toLowerCase()}1.jpg`,
            local_path: "/dummy/path/file1.jpg",
          },
          {
            file_name: `${status.toLowerCase()}2.jpg`,
            local_path: "/dummy/path/file2.jpg",
          },
        ],
      },
      pending_reason:
        status === "PENDING"
          ? "Pelanggan minta dikunjungi sebelum jam 09:00"
          : null,
      new_hasil_visit: status,
      old_hasil_visit: "ON_PROGRESS",
    },
    ticket: {
      id: Math.floor(Math.random() * 10000000),
      incident: "INC" + Math.floor(Math.random() * 999999),
      workzone: "JGR",
      service_no: "152407219006",
      owner_group: "TIF ASR FBB DISTRICT SURAMADU",
      customer_name: "AFEN SIN NATA",
      customer_type: "HVC_GOLD",
    },
    event_id: `test-${status}-${Date.now()}`, // anti duplicate
    event_type: "TICKET_STATUS_CHANGED",
    event_label: `TEST_${status}`,
    occurred_at: new Date().toISOString(),
    new_technician: {
      nik: "18960736",
      nama: "KHOIRUL MUHTAJIB",
      id_user: 100,
    },
  };
}

async function sendWebhook(status) {
  try {
    const payload = {
      events: [createEvent(status)],
    };

    const res = await axios.post(URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": SECRET,
      },
    });

    console.log(`✅ SUCCESS [${status}]`, res.data);
  } catch (err) {
    console.error(`❌ ERROR [${status}]`, err.response?.data || err.message);
  }
}

// 🔥 pilih mau test apa aja
async function runTest() {
  await sendWebhook("ASSIGNED");
  await sendWebhook("PENDING");
  await sendWebhook("CLOSE");
}

runTest();
