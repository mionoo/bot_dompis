const { transformEvent } = require("./hookDompis.transformer");
const { sendEvidence, sendMessage } = require("./hookDompis.kirimTelegram");
//const { saveEventDompisSheet } = require("../../adapters/gsheetTTRArea3");
const {
  cariNakerDariNIK,
  dariWorkZoneCariSA,
  dariSAcariIdGrup,
  cariGrupDariSA,
  cariGrupKawaldariBranch,
  saveEventDompis,
  saveTelegramDeliveryLog,
} = require("./hookDompis.cekDb");
const {
  classifyTicket,
} = require("../segmentasiTiket/segmentasi.classify.Ticket");
const AllTickets = require("../segmentasiTiket/segmentasi.allTiket");

const {
  Assist1,
  Assist2,
  Assist3,
  AssistSuramadu,
} = require("../../core/telegramInstance");

const BOT_MAP = {
  Assist1,
  Assist2,
  Assist3,
  AssistSuramadu,
};

function getNowWIB() {
  const now = new Date();

  // WIB = UTC +7
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  return wib.toISOString().replace("T", " ").substring(0, 19);
}

async function getBotByZone(zone) {
  const bot = BOT_MAP[zone];

  if (!bot) {
    console.warn(`⚠️ Zone "${zone}" tidak dikenal → fallback Assist1`);

    // 🔥 kirim notifikasi ke admin
    try {
      await AssistSuramadu.telegram.sendMessage(
        process.env.ADMIN_BOT,
        `⚠️ <b>ZONEBOT TIDAK DITEMUKAN</b>

📍 Zone: <b>${zone || "NULL"}</b>
🕒 ${new Date().toLocaleString("id-ID")}

➡️ Menggunakan fallback: <b>Assist1</b>
        `,
        { parse_mode: "HTML" },
      );
    } catch (err) {
      console.error("❌ Gagal kirim notifikasi ke admin:", err.message);
    }

    return BOT_MAP.Assist1;
  }

  return bot;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ubah ke true jika notifikasi KAWAL untuk ASSIGN dan REASSIGN ingin diaktifkan lagi.
const ENABLE_KAWAL_ASSIGN_NOTIFICATIONS = false;

async function sendWithDeliveryLog({
  send,
  eventId,
  incident,
  eventType,
  deliveryType,
  targetType,
  chatId,
  topicId,
  zone,
}) {
  let result;

  try {
    result = await send();
  } catch (err) {
    result = {
      success: false,
      reasonCode: "UNEXPECTED_SEND_ERROR",
      reason: err.message || "Terjadi kesalahan saat mengirim Telegram",
    };
  }

  await saveTelegramDeliveryLog({
    eventId,
    incident,
    eventType,
    deliveryType,
    targetType,
    chatId: chatId ? String(chatId) : null,
    topicId: topicId || null,
    zone,
    status: result?.success ? "SENT" : "FAILED",
    reasonCode: result?.success ? null : result?.reasonCode || "UNKNOWN_SEND_ERROR",
    reason: result?.success ? null : result?.reason || "Pengiriman Telegram gagal",
    telegramErrorCode: result?.telegramErrorCode || null,
    telegramErrorDescription: result?.telegramErrorDescription || null,
    itemsSent: result?.itemsSent || 0,
  });

  return result;
}

async function saveSkippedDelivery({
  eventId, incident, eventType, deliveryType, targetType, zone, reasonCode, reason,
}) {
  await saveTelegramDeliveryLog({
    eventId,
    incident,
    eventType,
    deliveryType,
    targetType,
    zone,
    status: "SKIPPED",
    reasonCode,
    reason,
  });
}

async function processEvent(rawEvent) {
  const transformed = transformEvent(rawEvent);

  await delay(500); // opsional kalau mau konsisten

  if (!transformed || transformed.type === "UNKNOWN") return;

  // Cari ticket lengkap untuk proses segmentasi
  let jenis_tiket = "-";

  try {
    const ticketDb = await AllTickets.findOne({
      incident: transformed.ticket?.incident,
    }).lean();

    if (ticketDb) {
      jenis_tiket = classifyTicket(ticketDb);
    }
  } catch (err) {
    console.error("Gagal classify ticket:", err.message);
  }

  const event_id = transformed.event_id || null;
  const tiket = transformed.ticket?.incident || null;
  const noServis = transformed.ticket?.service_no || null;
  const nik = transformed.new_technician?.nik || null;
  const namateknisi = transformed.new_technician?.nama || null;
  const workzone = transformed.ticket?.workzone || null;

  //console.log(`🔔 Event ${transformed.type} | tiket: ${tiket}`);

  const adminName = transformed.admin?.nama || null;

  const datalog = {
    eventId: transformed.event_id || null,
    type: transformed.type || null,
    waktu: getNowWIB(),
    nik: nik,
    tiket: tiket,
    noServi: noServis,
    workzone: workzone,
    admin: adminName,
    namateknisi: namateknisi,
  };

  const result = await saveEventDompis(datalog);

  // 🔥 STOP kalau duplicate
  if (result.isDuplicate) {
    console.log(`⚠️ Duplicate event_id: ${datalog.eventId} → skip`);
    return;
  }

  //console.log(`✅ Event baru: ${datalog.eventId}`);

  const idUnik = `${Date.now()}`;

  // 🔥 DETEKSI AUTO / MANUAL
  let assignType = null;
  if (adminName) {
    if (/AUTO-ASSIGN/i.test(adminName)) {
      assignType = "AUTO";
    } else {
      assignType = "MANUAL";
    }
  }

  switch (transformed.type) {
    // =========================
    // ASSIGN
    // =========================
    case "ASSIGN":
      try {

        if (!nik) {
          console.log("⚠️ NIK kosong");
          return;
        }

        // 🔥 1. cari teknisi
        const teknisi = await cariNakerDariNIK(nik);
        console.log(teknisi);
        if (!teknisi) {
          console.log(`⚠️ Teknisi dengan NIK ${nik} tidak ditemukan`);
          return;
        }

        // 🔥 2. cari SA + ZONEBOT dari workzone
        const saData = await dariWorkZoneCariSA(workzone);
        console.log("SA DATA:", saData);
        if (!saData) {
          // console.log(`⚠️ SA untuk workzone ${workzone} tidak ditemukan`);
          return;
        }

        const zone = saData.ZONEBOT || null;
        // console.log("ZONE:", zone);

        // 🔥 3. pilih bot berdasarkan zone
        //const selectedBot = getBotByZone(zone);
        const selectedBot = await getBotByZone(zone);

        // 🔥 4. cari grup KAWAL dari SA
        //const groups = await cariGrupDariSA(saData.SERVICE_AREA, "KAWAL");
        const groups = await cariGrupKawaldariBranch(
          `BRANCH ${saData.BRANCH}`,
          "KAWAL",
        );
        //cariGrupKawaldariBranch

        if (!groups || groups.length === 0) {
          console.log(
            `⚠️ Grup KAWAL tidak ditemukan untuk SA ${saData.SERVICE_AREA}`,
          );
        }

        // =========================
        // 📩 PESAN KE TEKNISI
        // =========================
        const pesanTeknisi = `
<b>📌 TIKET BARU DI-ASSIGN</b>

🎫 <b>${tiket}</b>
🔧 No. Service : ${noServis || "-"}
🏷️ Customer : ${transformed.ticket?.customer_name || "-"}
⭐ Segment : ${transformed.ticket?.customer_type || "-"}

📍 Workzone : ${transformed.ticket?.workzone || "-"}

🚀 Segera lakukan <b>PICKUP</b> di aplikasi <b>DOMPIS</b>
`.trim();

        if (teknisi.ID_TELEGRAM) {
          try {
            await sendWithDeliveryLog({
              eventId: event_id, incident: tiket, eventType: transformed.type,
              deliveryType: "MESSAGE", targetType: "TECHNICIAN",
              chatId: teknisi.ID_TELEGRAM, zone,
              send: () => sendMessage({
                bot: selectedBot, chatId: teknisi.ID_TELEGRAM, text: pesanTeknisi,
              }),
            });
          } catch (err) {
            console.error("❌ Gagal mengirim pesan ke teknisi", err);
          }
        } else {
          console.log(`⚠️ Teknisi ${nik} belum punya Telegram ID`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "TECHNICIAN", zone,
            reasonCode: "TECHNICIAN_TELEGRAM_NOT_FOUND",
            reason: `Teknisi ${nik} belum memiliki Telegram ID`,
          });
        }

        // =========================
        // 📩 PESAN KE GRUP KAWAL
        // =========================
        //#assign INC48854914, 22990082  assign lensa *1777811198585

        var logadmin = "";

        if (assignType === "AUTO") {
          logadmin = "AUTO-ASSIGN";
        }

        const pesanGrup = `
#assign ${tiket}, ${nik} ${logadmin} assign lensa ${jenis_tiket} | *${idUnik}
`.trim();

        if (ENABLE_KAWAL_ASSIGN_NOTIFICATIONS && groups && groups.length > 0) {
          for (const g of groups) {
            try {
              const topicId = g.ID_TOPIC_GRUP ? Number(g.ID_TOPIC_GRUP) : undefined;
              await sendWithDeliveryLog({
                eventId: event_id, incident: tiket, eventType: transformed.type,
                deliveryType: "MESSAGE", targetType: "KAWAL_GROUP",
                chatId: g.ID_GRUP, topicId, zone,
                send: () => sendMessage({
                  bot: selectedBot, chatId: g.ID_GRUP, topicId, text: pesanGrup,
                }),
              });
            } catch (err) {
              console.error(
                `❌ Gagal mengirim pesan ke grup ${g.ID_GRUP}`,
                err,
              );
            }
          }
        } else if (ENABLE_KAWAL_ASSIGN_NOTIFICATIONS) {
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "KAWAL_GROUP", zone,
            reasonCode: "KAWAL_GROUP_NOT_FOUND",
            reason: `Grup KAWAL tidak ditemukan untuk SA ${saData.SERVICE_AREA}`,
          });
        }

        console.log(`✅ ASSIGN DONE ${tiket} | zone: ${zone}`);
      } catch (err) {
        console.error("❌ ASSIGN error", err);
      }
      break;

    // =========================
    // REASSIGN
    // =========================
    case "REASSIGN":
      try {
        const newNik = transformed.new_technician?.nik || null;
        const oldNik = transformed.old_technician?.nik || null;


        if (!newNik && !oldNik) {
          console.log("⚠️ NIK baru & lama kosong");
          return;
        }

        // 🔥 1. ambil teknisi
        const dataNew = newNik ? await cariNakerDariNIK(newNik) : null;
        const dataOld = oldNik ? await cariNakerDariNIK(oldNik) : null;

        // 🔥 2. ambil SA + ZONEBOT
        const saData = await dariWorkZoneCariSA(workzone);
        if (!saData) {
          console.log(`⚠️ SA tidak ditemukan untuk ${workzone}`);
          return;
        }

        const zone = saData.ZONEBOT || null;

        const selectedBot = await getBotByZone(zone);

        console.log(
          "SA DATA:",
          saData,
          "ZONE:",
          zone,
          "SELECTED BOT:",
          selectedBot ? "FOUND" : "NOT FOUND",
        );

        // 🔥 3. ambil grup KAWAL
        // const groups = await cariGrupDariSA(saData.SERVICE_AREA, "KAWAL");
        const groups = await cariGrupKawaldariBranch(
          `BRANCH ${saData.BRANCH}`,
          "KAWAL",
        );

        // =========================
        // 📩 PESAN TEKNISI BARU
        // =========================
        if (dataNew?.ID_TELEGRAM) {
          const pesanNew = `
📥 <b>TIKET MASUK (REASSIGN)</b>

🎫 <b>${tiket}</b>
🔧 No. Service : ${noServis || "-"}
🏷️ Customer : ${transformed.ticket?.customer_name || "-"}
⭐ Segment : ${transformed.ticket?.customer_type || "-"}

📍 Workzone : ${transformed.ticket?.workzone || "-"}

🚀 Segera lakukan <b>PICKUP</b> di aplikasi <b>DOMPIS</b>
`.trim();
          try {
            await sendWithDeliveryLog({
              eventId: event_id, incident: tiket, eventType: transformed.type,
              deliveryType: "MESSAGE", targetType: "TECHNICIAN",
              chatId: dataNew.ID_TELEGRAM, zone,
              send: () => sendMessage({
                bot: selectedBot, chatId: dataNew.ID_TELEGRAM, text: pesanNew,
              }),
            });
          } catch (err) {
            console.error("❌ Gagal mengirim pesan ke teknisi baru", err);
          }
        } else {
          console.log(`⚠️ Teknisi baru tidak punya Telegram`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "TECHNICIAN", zone,
            reasonCode: "TECHNICIAN_TELEGRAM_NOT_FOUND",
            reason: `Teknisi baru ${newNik || "-"} belum memiliki Telegram ID`,
          });
        }

        // =========================
        // 📩 PESAN TEKNISI LAMA
        // =========================
        if (dataOld?.ID_TELEGRAM) {
          const pesanOld = `
📤 <b>TIKET DIPINDAHKAN</b>

🎫 <b>${tiket}</b>
🔧 No. Service : ${noServis || "-"}

ℹ️ Tiket ini telah <b>dialihkan ke teknisi lain</b>

Terima kasih 🙏
`.trim();

          try {
            await sendWithDeliveryLog({
              eventId: event_id, incident: tiket, eventType: transformed.type,
              deliveryType: "MESSAGE", targetType: "TECHNICIAN",
              chatId: dataOld.ID_TELEGRAM, zone,
              send: () => sendMessage({
                bot: selectedBot, chatId: dataOld.ID_TELEGRAM, text: pesanOld,
              }),
            });
          } catch (err) {
            console.error("❌ Gagal mengirim pesan ke teknisi lama", err);
          }
        } else {
          console.log(`⚠️ Teknisi lama tidak punya Telegram`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "TECHNICIAN", zone,
            reasonCode: "TECHNICIAN_TELEGRAM_NOT_FOUND",
            reason: `Teknisi lama ${oldNik || "-"} belum memiliki Telegram ID`,
          });
        }

        // =========================
        // 📩 PESAN KE GRUP KAWAL
        // =========================

        //#assign INC48854914, 22990082  assign lensa *1777811198585

        const pesanGrup = `
#assign ${tiket}, ${nik} ${logadmin} assign lensa ${jenis_tiket} | *${idUnik}
`.trim();

        if (ENABLE_KAWAL_ASSIGN_NOTIFICATIONS && groups && groups.length > 0) {
          for (const g of groups) {
            try {
              const topicId = g.ID_TOPIC_GRUP ? Number(g.ID_TOPIC_GRUP) : undefined;
              await sendWithDeliveryLog({
                eventId: event_id, incident: tiket, eventType: transformed.type,
                deliveryType: "MESSAGE", targetType: "KAWAL_GROUP",
                chatId: g.ID_GRUP, topicId, zone,
                send: () => sendMessage({
                  bot: selectedBot, chatId: g.ID_GRUP, topicId, text: pesanGrup,
                }),
              });
            } catch (err) {
              console.error(
                `❌ Gagal mengirim pesan ke grup ${g.ID_GRUP}`,
                err,
              );
            }
          }
        } else if (ENABLE_KAWAL_ASSIGN_NOTIFICATIONS) {
          console.log(`⚠️ Grup KAWAL tidak ditemukan`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "KAWAL_GROUP", zone,
            reasonCode: "KAWAL_GROUP_NOT_FOUND",
            reason: `Grup KAWAL tidak ditemukan untuk SA ${saData.SERVICE_AREA}`,
          });
        }

        console.log(`✅ REASSIGN DONE ${tiket} | zone: ${zone}`);
      } catch (err) {
        console.error("❌ REASSIGN error", err);
      }
      break;

    // =========================
    // PICKUP
    // =========================
    case "PICKUP_ORDER":
      try {
        if (!nik) {
          console.log(`⚠️ NIK kosong (PICKUP_ORDER) tiket: ${tiket}`);
          return;
        }

        // 🔥 1. cari teknisi
        const teknisi = await cariNakerDariNIK(nik);
        if (!teknisi) {
          console.log(`⚠️ Teknisi tidak ditemukan (NIK: ${nik})`);
          return;
        }

        // 🔥 2. cari SA + ZONEBOT
        const saData = await dariWorkZoneCariSA(workzone);
        if (!saData) {
          console.log(`⚠️ SA tidak ditemukan untuk ${workzone}`);
          return;
        }

        const zone = saData.ZONEBOT || null;

        // 🔥 3. pilih bot berdasarkan zone
        //const selectedBot = getBotByZone(zone);
        const selectedBot = await getBotByZone(zone);

        // =========================
        // 📩 PESAN KE TEKNISI
        // =========================
        const pesanTeknisi = `
<b>📌 CEK APLIKASI LENSA</b>

Jika tiket berikut belum muncul:

🎫 <b>${tiket}</b>
🔧 ${noServis}
⭐ Segment : ${transformed.ticket?.customer_type || "-"}

Silakan kirim pesan berikut ke grup KAWAL:

<code>#assign ${tiket}, ${nik} moban assign lensa</code>
`.trim();

        if (teknisi.ID_TELEGRAM) {
          try {
            await sendWithDeliveryLog({
              eventId: event_id, incident: tiket, eventType: transformed.type,
              deliveryType: "MESSAGE", targetType: "TECHNICIAN",
              chatId: teknisi.ID_TELEGRAM, zone,
              send: () => sendMessage({
                bot: selectedBot, chatId: teknisi.ID_TELEGRAM, text: pesanTeknisi,
              }),
            });
          } catch (err) {
            console.error("❌ Gagal mengirim pesan ke teknisi", err);
          }
        } else {
          console.log(`⚠️ Teknisi ${nik} belum punya Telegram`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "MESSAGE", targetType: "TECHNICIAN", zone,
            reasonCode: "TECHNICIAN_TELEGRAM_NOT_FOUND",
            reason: `Teknisi ${nik} belum memiliki Telegram ID`,
          });
        }
        console.log(`✅ PICKUP_ORDER DONE ${tiket} | zone: ${zone}`);
      } catch (err) {
        console.error("❌ PICKUP_ORDER error", err);
      }
      break;

    // =========================
    // PENDING
    // =========================
    case "PENDING":
      try {
        console.log(`⏳ PENDING ${tiket}`);

        // 🔥 1. ambil SA + ZONEBOT
        const saData = await dariWorkZoneCariSA(workzone);
        if (!saData) {
          console.log(`⚠️ SA tidak ditemukan untuk ${workzone}`);
          return;
        }

        const zone = saData.ZONEBOT || null;

        // 🔥 3. pilih bot berdasarkan zone
        //const selectedBot = getBotByZone(zone);
        const selectedBot = await getBotByZone(zone);

        // 🔥 2. ambil grup REPORT (utama)
        const reportGroups = await cariGrupDariSA(
          saData.SERVICE_AREA,
          "REPORT",
        );

        // 🔥 optional: juga kirim ke KAWAL
        // const kawalGroups = await cariGrupDariSA(saData.SERVICE_AREA, "KAWAL");

        // 🔥 3. ambil data teknisi
        const teknisi = nik ? await cariNakerDariNIK(nik) : null;

        // 🔥 4. ambil alasan pending
        const alasan = transformed.pendingReason || "-";

        // =========================
        // 📩 PESAN PENDING
        // =========================
        const pesanPending = `
<b>⏳ TIKET PENDING</b>

🎫 <b>Incident :</b> ${tiket}
⭐ Segment : ${transformed.ticket?.customer_type || "-"}
👤 <b>PETUGAS :</b> ${nik || "-"} ${teknisi?.NAMA || "-"}
🛠 <b>Service :</b> ${noServis}

📊 <b>PENDING REASON</b>
${alasan || "-"}

📷 <i>⚠️ Status: Menunggu tindak lanjut</i>
`.trim();

        // =========================
        // 📩 KIRIM KE REPORT
        // =========================
        if (reportGroups && reportGroups.length > 0) {
          for (const g of reportGroups) {
            try {
              // 🔥 kirim evidence
              const topicId = g.ID_TOPIC_GRUP ? Number(g.ID_TOPIC_GRUP) : undefined;
              await sendWithDeliveryLog({
                eventId: event_id, incident: tiket, eventType: transformed.type,
                deliveryType: "EVIDENCE", targetType: "REPORT_GROUP",
                chatId: g.ID_GRUP, topicId, zone,
                send: () => sendEvidence({
                  incident: tiket, type: "pending", chatId: g.ID_GRUP, topicId,
                  bot: selectedBot, caption: pesanPending,
                }),
              });
            } catch (err) {
              console.error(
                `❌ Gagal mengirim pesan ke grup ${g.ID_GRUP}`,
                err,
              );
            }
          }
        } else {
          console.log(`⚠️ Grup REPORT tidak ditemukan`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "EVIDENCE", targetType: "REPORT_GROUP", zone,
            reasonCode: "REPORT_GROUP_NOT_FOUND",
            reason: `Grup REPORT tidak ditemukan untuk SA ${saData.SERVICE_AREA}`,
          });
        }

        console.log(`✅ PENDING DONE ${tiket} | zone: ${zone}`);
      } catch (err) {
        console.error("❌ PENDING error", err);
      }
      break;

    // =========================
    // CLOSE
    // =========================
    case "CLOSE_TICKET":
      try {
        console.log(`✅ CLOSE ${tiket}`);

        // 🔥 1. ambil SA + ZONEBOT
        const saData = await dariWorkZoneCariSA(workzone);
        if (!saData) {
          console.log(`⚠️ SA tidak ditemukan untuk ${workzone}`);
          return;
        }

        const zone = saData.ZONEBOT || null;

        // 🔥 3. pilih bot berdasarkan zone
        //const selectedBot = getBotByZone(zone);
        const selectedBot = await getBotByZone(zone);

        // 🔥 2. ambil grup REPORT (utama)
        const reportGroups = await cariGrupDariSA(
          saData.SERVICE_AREA,
          "REPORT",
        );

        // 🔥 optional: kirim juga ke KAWAL
        // const kawalGroups = await cariGrupDariSA(saData.SERVICE_AREA, "KAWAL");

        // 🔥 3. ambil teknisi
        const teknisi = nik ? await cariNakerDariNIK(nik) : null;

        // 🔥 4. ambil data close
        const rca = transformed.rca || "-";
        const subRca = transformed.sub_rca || "-";
        const detail = transformed.detail || "-";
        const costumer_type = transformed.ticket?.customer_type || "-";

        // =========================
        // 📩 PESAN CLOSE
        // =========================
        const pesan = `
<b>🔒 TIKET CLOSED</b>

🎫 <b>Incident :</b> ${tiket}
⭐ Segment : ${transformed.ticket?.customer_type || "-"}
👤 <b>PETUGAS :</b> ${nik || "-"} ${teknisi?.NAMA || "-"}
🛠 <b>Service :</b> ${noServis}
📋 <b>Keterangan :</b> ${detail}

📊 <b>RCA</b>
${rca} - ${subRca}

📷 <i>Evidence perbaikan terlampir</i>
`.trim();

        // =========================
        // 📩 KIRIM KE REPORT
        // =========================
        if (reportGroups && reportGroups.length > 0) {
          for (const g of reportGroups) {
            // 🔥 kirim evidence
            try {
              const topicId = g.ID_TOPIC_GRUP ? Number(g.ID_TOPIC_GRUP) : undefined;
              await sendWithDeliveryLog({
                eventId: event_id, incident: tiket, eventType: transformed.type,
                deliveryType: "EVIDENCE", targetType: "REPORT_GROUP",
                chatId: g.ID_GRUP, topicId, zone,
                send: () => sendEvidence({
                  incident: tiket, type: "close", chatId: g.ID_GRUP, topicId,
                  bot: selectedBot, caption: pesan,
                }),
              });
            } catch (err) {
              console.error(
                `❌ Gagal mengirim pesan ke grup ${g.ID_GRUP}`,
                err,
              );
            }
          }
        } else {
          console.log(`⚠️ Grup REPORT tidak ditemukan`);
          await saveSkippedDelivery({
            eventId: event_id, incident: tiket, eventType: transformed.type,
            deliveryType: "EVIDENCE", targetType: "REPORT_GROUP", zone,
            reasonCode: "REPORT_GROUP_NOT_FOUND",
            reason: `Grup REPORT tidak ditemukan untuk SA ${saData.SERVICE_AREA}`,
          });
        }

        console.log(`✅ CLOSE DONE ${tiket} | zone: ${zone}`);
      } catch (err) {
        console.error("❌ CLOSE error", err);
      }
      break;

    default:
      console.log("❓ UNKNOWN TYPE");
  }
}

module.exports = { processEvent, getNowWIB };
