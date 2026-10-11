const moment = require("moment-timezone");

const { SEGMENT_PRIORITY } = require("../branch/branch.data");

// =====================================================
// FORMAT SISA WAKTU
// =====================================================

function formatRemainingTime(decimalHours) {
  const totalMinutes = Math.floor(decimalHours * 60);

  const sign = totalMinutes < 0 ? "-" : "";

  const absMinutes = Math.abs(totalMinutes);

  const hours = Math.floor(absMinutes / 60);

  const minutes = absMinutes % 60;

  return sign + hours + ":" + (minutes < 10 ? "0" + minutes : minutes);
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {
  if (!date) return "-";

  return moment.utc(date).tz("Asia/Jakarta").format("DD/MM/YYYY HH:mm");
}

// =====================================================
// BUILD MESSAGE
// =====================================================

function buildTtrb2bMessage(hsa, tiketList) {
  let msg =
    `📍 <b>HSA: ${hsa}</b>\n` + `Total Tiket : <b>${tiketList.length}</b>\n\n`;

  // ===================================================
  // GROUP SEGMENT → SLA STAGE
  // ===================================================

  const grouped = {};

  tiketList.forEach((t) => {
    const seg = t.SEGMEN;

    // Untuk SLA biasa, analyzer tetap memberikan stage 1
    const stage = t.slaStage || 1;

    if (!grouped[seg]) {
      grouped[seg] = {};
    }

    if (!grouped[seg][stage]) {
      grouped[seg][stage] = [];
    }

    grouped[seg][stage].push(t);
  });

  // ===================================================
  // SORT SEGMENT
  // ===================================================

  Object.keys(grouped)
    .sort((a, b) => (SEGMENT_PRIORITY[a] || 99) - (SEGMENT_PRIORITY[b] || 99))
    .forEach((seg) => {
      const stages = grouped[seg];

      // =================================================
      // SORT STAGE
      // =================================================

      Object.keys(stages)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((stage) => {
          const data = stages[stage];

          // =================================================
          // SLA DARI ANALYZER
          // =================================================

          const sla = data[0]?.sla || "-";

          // =================================================
          // COUNT OVER SLA
          // =================================================

          const overSla = data.filter((t) => t.status === "OVER SLA").length;

          // =================================================
          // HEADER
          // =================================================

          msg +=
            `\n📌 <b>${seg}</b>` +
            ` (` +
            `${data.length} tiket | ` +
            `SLA ${sla}H`;

          if (overSla > 0) {
            msg += ` | 🔴 ${overSla} OVER SLA`;
          }

          msg += `)\n`;

          // =================================================
          // SORT TICKET
          // =================================================

          data.sort((a, b) => a.remaining - b.remaining);

          // =================================================
          // BUILD TICKET
          // =================================================

          data.forEach((t) => {
            let icon = "🟢";

            if (t.status === "WARNING") {
              icon = "🟡";
            }

            if (t.status === "CRITICAL") {
              icon = "🟠";
            }

            if (t.status === "OVER SLA") {
              icon = "🔴";
            }

            let extra = "";

            // FFG

            if (t.STATUS_FFG === "FFG") {
              extra += " | FFG";
            }

            // BOOKING DATE

            if (t.BOOKING_DATE) {
              extra += ` | ${formatDate(t.BOOKING_DATE)}`;
            }

            msg +=
              `${icon} <code>${t.TIKET}</code>` +
              ` | Sisa: <b>${formatRemainingTime(t.remaining)}</b>` +
              ` | ${t.STO}` +
              extra +
              `\n`;
          });
        });
    });

  // ===================================================
  // FOOTER
  // ===================================================

  return msg;
}

module.exports = {
  buildTtrb2bMessage,
};
