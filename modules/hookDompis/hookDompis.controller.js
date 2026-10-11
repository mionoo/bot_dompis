const crypto = require("crypto");

const { processEvent } = require("./hookDompis.service");
const { saveLogDompis } = require("./hookDompis.cekDb");
const { RegulerTickets } = require("../../models/dompis");

const { Telegraf } = require("telegraf");

const AssistSuramadu = new Telegraf(process.env.Assist_SuraMadu_TOKEN);

const ADMIN_CHAT_ID = process.env.ADMIN_BOT;

// =====================================
// WIB TIME
// =====================================

function getNowWIB() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}

// =====================================
// WEBHOOK HANDLER
// =====================================

async function handleDompisWebhook(req, res) {
  try {
    // =====================================
    // LOG RAW REQUEST
    // =====================================

    if (req.body.event_type === "REGULER_BRANCH_REPORT") {
      const branches = req.body.branches || [];
      console.log(req.body.total_tickets);
      const ticketMap = new Map();

      for (const branch of branches) {
        const tickets = branch.tickets || [];

        for (const ticket of tickets) {
          ticketMap.set(ticket.incident, {
            branch_name: branch.branch_name,

            incident: ticket.incident,

            reported_date: ticket.reported_date
              ? new Date(ticket.reported_date)
              : null,

            service_area: ticket.service_area,

            service_no: ticket.service_no,

            service_type: ticket.service_type,

            booking_date: ticket.booking_date
              ? new Date(ticket.booking_date)
              : null,

            jenis_tiket_1: ticket.jenis_tiket_1,

            jenis_tiket_2: ticket.jenis_tiket_2,

            guarantee_status: ticket.guarantee_status,

            area: ticket.area,

            teknisi: ticket.teknisi,

            status_update: ticket.status_update,
          });
        }
      }

      const bulkData = Array.from(ticketMap.values());

      await RegulerTickets.deleteMany({});

      await RegulerTickets.insertMany(bulkData);

      console.log("✅ SUCCESS REFRESH DATA");
    }

    // console.log("\n==============================");
    // console.log("📥 WEBHOOK MASUK");
    // console.log("==============================");

    // console.log("🕒 WIB:", getNowWIB());

    // console.log("\n🌐 METHOD:");
    // console.log(req.method);

    // console.log("\n🌐 URL:");
    // console.log(req.originalUrl);

    // console.log("\n🌐 IP:");
    // console.log(req.headers["x-forwarded-for"] || req.socket.remoteAddress);

    // console.log("\n📦 HEADERS:");
    // console.log(JSON.stringify(req.headers, null, 2));

    // console.log("\n📦 QUERY:");
    // console.log(JSON.stringify(req.query, null, 2));

    // console.log("\n📦 BODY:");
    // console.log(JSON.stringify(req.body, null, 2));

    await saveLogDompis({
      raw: req.body,
      waktu: getNowWIB(),
    });

    // console.log("\n📦 RAW BODY:");
    // console.log(req.rawBody);

    // console.log("==============================\n");

    // =====================================
    // SECRET VALIDATION
    // =====================================
const secret = req.headers["x-cron-secret"];

const timestamp = req.query.timestamp;
const signature = req.query.signature;

const allowedSecrets = [
  process.env.TECH_EVENTS_WEBHOOK_SECRET,
  process.env.TECH_EVENTS_WEBHOOK_SECRET_2,
].filter(Boolean);

console.log("===== WEBHOOK AUTH DEBUG =====");

// =====================================
// SECRET VALIDATION
// =====================================

if (!allowedSecrets.includes(secret)) {

  console.log("❌ SECRET TIDAK MATCH");

  await AssistSuramadu.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `❌ Webhook Unauthorized`,
  );

  return res.status(401).json({
    ok: false,
    message: "Unauthorized",
  });
}

console.log("✅ SECRET MATCH");

// =====================================
// HMAC VALIDATION
// =====================================

if (timestamp && signature) {

  const payload = `${timestamp}.${req.rawBody}`;

  const valid = allowedSecrets.some((secretKey) => {

    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload, "utf8")
      .digest("hex");

    // hindari crash timingSafeEqual
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  });

  if (!valid) {

    console.log("❌ HMAC INVALID");

    await AssistSuramadu.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `❌ HMAC Signature Invalid`,
    );

    return res.status(401).json({
      ok: false,
      message: "Invalid Signature",
    });
  }

  console.log("✅ HMAC VALID");
}

    // =====================================
    // PROCESS EVENTS
    // =====================================

    const events = req.body.events || [];

    console.log(`📥 EVENTS RECEIVED: ${events.length}`);

    for (const event of events) {
      console.log(`🚀 PROCESS EVENT: ${event.event_type}`);

      await processEvent(event);
    }

    return res.json({
      ok: true,
    });
  } catch (err) {
    console.error("🔥 WEBHOOK ERROR:");
    console.error(err);

    await AssistSuramadu.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `🔥 Webhook Error:\n${err.message}`,
    );

    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}

module.exports = {
  handleDompisWebhook,
};
