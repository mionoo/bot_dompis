const { SEGMENT_PRIORITY, SLA_MAPS } = require("../branch/branch.data");

// =========================
// FORMAT TANGGAL
// =========================
function formatDate(date) {
  if (!date) return null;

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

// =========================
// PRIORITAS SEGMENT
// =========================
function getSegmentPriority(segment) {
  return SEGMENT_PRIORITY[segment] || 999;
}

// =========================
// FORMAT SISA WAKTU
// =========================
function formatRemainingTime(decimalHours) {
  if (
    decimalHours === null ||
    decimalHours === undefined ||
    isNaN(decimalHours)
  ) {
    return "-";
  }

  const totalMinutes = Math.floor(decimalHours * 60);

  const sign = totalMinutes < 0 ? "-" : "";

  const absMinutes = Math.abs(totalMinutes);

  const hours = Math.floor(absMinutes / 60);

  const minutes = absMinutes % 60;

  return sign + hours + ":" + (minutes < 10 ? "0" + minutes : minutes);
}

// =========================
// MAIN FUNCTION
// =========================
function buildTTRMessage(hsa, list) {
  let msg = `📍 <b>HSA: ${hsa}</b>\n`;

  msg += `Total Tiket : <b>${list.length}</b>\n\n`;

  const group = {};

  // =========================
  // GROUPING SEGMENT
  // =========================
  list.forEach((t) => {
    const seg = t.SEGMEN || "UNKNOWN";

    if (!group[seg]) {
      group[seg] = [];
    }

    group[seg].push(t);
  });

  // =========================
  // SORT SEGMENT
  // =========================
  const sortedSegments = Object.keys(group).sort(
    (a, b) => getSegmentPriority(a) - getSegmentPriority(b),
  );

  // =========================
  // BUILD MESSAGE
  // =========================
  sortedSegments.forEach((seg) => {
    const data = group[seg];

    const sla = SLA_MAPS[seg] || "-";

    msg += `📌 <b>${seg}</b> (${data.length} tiket | SLA ${sla}H)\n`;

    data
      .sort((a, b) => a.remaining - b.remaining)
      .forEach((t, i) => {
        let icon = "🟢";

        if (t.status === "WARNING") icon = "🟡";

        if (t.status === "CRITICAL") icon = "🟠";

        if (t.status === "OVER SLA") icon = "🔴";

        let extra = "";

        // =========================
        // FFG
        // =========================
        if (t.STATUS_FFG == "GUARANTEE") {
          extra += " | FFG";
        }

        // =========================
        // BOOKING DATE
        // =========================
        if (t.BOOKING_DATE) {
          const bookingDate = new Date(t.BOOKING_DATE);

          const isValidBooking =
            !isNaN(bookingDate.getTime()) && bookingDate.getTime() > 0;

          if (isValidBooking) {
            extra += ` | ${formatDate(t.BOOKING_DATE)}`;
          }
        }

        // =========================
        // FLAGGING TEKNISI
        // =========================
        if (t.FLAGGING_TEKNISI !== "" && t.FLAGGING_TEKNISI != null) {
          extra += ` | ${t.FLAGGING_TEKNISI}`;
        }

        // =========================
        // TIKET B2B
        // =========================
        if (t.SEGMEN == "NODE_B"){
          extra += ` | ${t.ND}`;

        }


        // =========================
        // LABEL SISA / OVER
        // =========================
        let label = "Sisa";

        if (t.remaining < 0) {
          label = "OVER";
        }

        // =========================
        // RENDER TIKET
        // =========================
        msg +=
          `${icon} ${i + 1}. ` +
          `<code>${t.TIKET}</code> | ` +
          `Sisa: ${formatRemainingTime(t.remaining)} | ` +
          `${t.STO}${extra}\n`;
      });

    msg += "\n";
  });

  // =========================
  // FOOTER
  // =========================
  msg += "━━━━━━━━━━━━━━━━━━\n";
  msg += "⚠️ Segera lakukan penanganan.\n\n";

  return msg;
}

module.exports = { buildTTRMessage };
