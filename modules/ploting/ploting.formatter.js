// // ploting.formatter.js


const moment = require("moment-timezone");

const {
  SEGMENT_PRIORITY,
} = require("../branch/branch.data");


// =========================
// FORMAT SISA WAKTU
// =========================

function formatRemainingTime(decimalHours) {
  const totalMinutes =
    Math.floor(decimalHours * 60);

  const sign =
    totalMinutes < 0 ? "-" : "";

  const absMinutes =
    Math.abs(totalMinutes);

  const hours =
    Math.floor(absMinutes / 60);

  const minutes =
    absMinutes % 60;

  return (
    sign +
    hours +
    ":" +
    (minutes < 10 ? "0" + minutes : minutes)
  );
}


// =========================
// FORMAT DATE
// =========================

function formatDate(date) {
  if (!date) return "-";

  return moment
    .utc(date)
    .tz("Asia/Jakarta")
    .format("DD/MM/YYYY HH:mm");
}


// =========================
// SEGMENT PRIORITY
// =========================

function getSegmentPriority(segment) {
  return SEGMENT_PRIORITY[segment] || 999;
}


// =========================
// BUILD MESSAGE
// =========================

function buildMessagePloting(hsa, list) {

  let msg =
    `📍 <b>HSA: ${hsa}</b>\n` +
    `Total Tiket Belum Terplot: <b>${list.length}</b>\n\n`;


  // =========================
  // GROUP SEGMENT
  // =========================

  const grouped = {};

  list.forEach((t) => {

    const seg = t.SEGMEN;

    if (!grouped[seg]) {
      grouped[seg] = [];
    }

    grouped[seg].push(t);
  });


  // =========================
  // SORT SEGMENT
  // =========================

  Object.keys(grouped)
    .sort(
      (a, b) =>
        getSegmentPriority(a) -
        getSegmentPriority(b)
    )
    .forEach((seg) => {

      const tickets = grouped[seg];


      // =========================
      // SORT SISA SLA
      // =========================

      tickets.sort(
        (a, b) =>
          a.remaining - b.remaining
      );


      // =========================
      // SLA
      // =========================

      const sla =
        tickets[0]?.sla || "-";

      const slaStage =
        tickets[0]?.slaStage || 1;


      msg +=
        `📌 <b>${seg}</b> (` +
        `${tickets.length} Tiket | ` +
        `SLA ${sla}H`;

      if (slaStage > 1) {
        msg += ` | STAGE ${slaStage}`;
      }

      msg += `)\n`;


      // =========================
      // TICKET
      // =========================

      tickets.forEach((t, i) => {

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


        // BOOKING DATE

        if (t.BOOKING_DATE) {
          extra +=
            ` | ${formatDate(t.BOOKING_DATE)}`;
        }


        // FFG

        if (t.STATUS_FFG === "GUARANTEE") {
          extra += " | FFG";
        }


        // FLAGGING TEKNISI

        if (
          t.FLAGGING_TEKNISI &&
          t.FLAGGING_TEKNISI !==
            "Belum terplot teknisi"
        ) {
          extra +=
            ` | ${t.FLAGGING_TEKNISI}`;
        }


        // DEADLINE

        if (t.deadline) {
          extra +=
            ` | ${t.deadline}`;
        }


        msg +=
          `${icon} ${i + 1}. ` +
          `<code>${t.TIKET}</code> | ` +
          `Sisa: ` +
          `${formatRemainingTime(t.remaining)} | ` +
          `${t.STO}` +
          `${extra}\n`;
      });


      msg += "\n";
    });


  msg +=
    "━━━━━━━━━━━━━━━━━━\n";

  msg +=
    "⚠️ Segera lakukan ploting teknisi.\n\n";

  return msg;
}


module.exports = {
  buildMessagePloting,
};


// const { SEGMENT_PRIORITY, SLA_MAP } = require("../branch/branch.data");

// // =========================
// // NORMALIZE DATE
// // YYYY-MM-DD -> MM/DD/YYYY
// // =========================
// function normalizeDate(input) {
//   if (!input) return input;

//   if (input.includes("-")) {
//     const [datePart, timePart = "00:00:00"] = input.split(" ");

//     const [year, month, day] = datePart.split("-");

//     return `${month}/${day}/${year} ${timePart}`;
//   }

//   return input;
// }

// function getSegmentPriority(segment) {
//   return SEGMENT_PRIORITY[segment] || 999;
// }

// // =========================
// // FORMAT SISA WAKTU
// // =========================
// function formatRemainingTime(decimalHours) {
//   const totalMinutes = Math.floor(decimalHours * 60);

//   const sign = totalMinutes < 0 ? "-" : "";

//   const absMinutes = Math.abs(totalMinutes);

//   const hours = Math.floor(absMinutes / 60);

//   const minutes = absMinutes % 60;

//   return sign + hours + ":" + (minutes < 10 ? "0" + minutes : minutes);
// }

// // =========================
// // FORMAT DATE WIB
// // =========================
// function formatDate(date) {
//   if (!date) return "-";

//   return new Intl.DateTimeFormat("en-US", {
//     timeZone: "Asia/Jakarta",
//     year: "numeric",
//     month: "numeric",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: false,
//   })
//     .format(new Date(date))
//     .replace(",", "");
// }

// // =========================
// // PARSE DATE
// // SUPPORT MONGODB / ISO
// // =========================
// function parseWIBDate(input) {
//   if (!input) return null;

//   // jika sudah object Date
//   if (input instanceof Date) {
//     return input;
//   }

//   // support ISO string mongodb
//   const parsed = new Date(input);

//   if (!isNaN(parsed)) {
//     return parsed;
//   }

//   return null;
// }

// // =========================
// // BUILD MESSAGE
// // =========================
// // function buildMessagePloting(hsa, list) {
// //   let msg = `📍 <b>HSA: ${hsa}</b>\n`;

// //   msg += `Total Tiket Belum Terplot: <b>${list.length}</b>\n\n`;

// //   const grouped = {};

// //   //const now = new Date();

// //   // =========================
// //   // GROUP + HITUNG TTR
// //   // =========================
// //   list.forEach((t) => {
// //     const seg = t.SEGMEN;

// //    // const sla = SLA_MAP[seg] || 24;

// //    // const reported = parseWIBDate(t.REPORTED_DATE);

// //     // if (!reported || isNaN(reported)) {
// //     //   console.log(`❌ Invalid reported date for ${t.TIKET}:`, t.REPORTED_DATE);
// //     //   return;
// //     // }

// //     // HITUNG SLA
// //    // const slaMs = sla * 60 * 60 * 1000;

// //    // const elapsedMs = now - reported;

// //    // const remainingMs = slaMs - elapsedMs;

// //    // t.remaining = remainingMs / (1000 * 60 * 60);

// //     // STATUS
// //     // if (t.remaining <= 0) {
// //     //   t.status = "OVER SLA";
// //     // } else if (t.remaining <= 1) {
// //     //   t.status = "CRITICAL";
// //     // } else if (t.remaining <= 1.5) {
// //     //   t.status = "WARNING";
// //     // } else {
// //     //   t.status = "SAFE";
// //     // }

// //     // GROUPING
// //     if (!grouped[seg]) {
// //       grouped[seg] = [];
// //     }

// //     grouped[seg].push(t);
// //   });

// //   // =========================
// //   // SORT SEGMENT
// //   // =========================
// //   const sortedSegments = Object.keys(grouped).sort(
// //     (a, b) => getSegmentPriority(a) - getSegmentPriority(b),
// //   );

// //   // =========================
// //   // BUILD TICKET
// //   // =========================
// //   sortedSegments.forEach((seg) => {
// //     const tickets = grouped[seg];

// //     const sla = SLA_MAP[seg] || 24;

// //     // sort berdasarkan sisa SLA
// //     tickets.sort((a, b) => a.remaining - b.remaining);

// //     msg += `📌 <b>${seg}</b> (${tickets.length} Tiket | SLA ${sla}H)\n`;

// //     tickets.forEach((t, i) => {
// //       let icon = "🟢";

// //       if (t.status === "WARNING") icon = "🟡";

// //       if (t.status === "CRITICAL") icon = "🟠";

// //       if (t.status === "OVER SLA") icon = "🔴";

// //       let extra = "";

// //       if (t.BOOKING_DATE) {
// //         extra += ` | ${formatDate(t.BOOKING_DATE)}`;
// //       }

// // //      if (t.STATUS_FFG) {
// // //        extra += ` | ${t.STATUS_FFG}`;
// // //      }

// //       if (t.STATUS_FFG === "GUARANTEE") {
// //         extra += " | FFG";
// //       }

// //       if (
// //         t.FLAGGING_TEKNISI &&
// //         t.FLAGGING_TEKNISI !== "Belum terplot teknisi"
// //       ) {
// //         extra += ` | ${t.FLAGGING_TEKNISI}`;
// //       }

// //       if (t.deadline) {
// //         extra += ` | ${t.deadline}`;
// //       }

// //       msg +=
// //         `${icon} ${i + 1}. ` +
// //         `<code>${t.TIKET}</code> | ` +
// //         `Sisa: ${formatRemainingTime(t.remaining)} | ` +
// //         `${t.STO}${extra}\n`;
// //     });

// //     msg += "\n";
// //   });

// //   msg += "━━━━━━━━━━━━━━━━━━\n";

// //   msg += "⚠️ Segera lakukan ploting teknisi.\n\n";

// //   return msg;
// // }

// function buildMessagePloting(hsa, list) {
//   let msg =
//     `📍 <b>HSA: ${hsa}</b>\n`;

//   msg +=
//     `Total Tiket Belum Terplot: <b>${list.length}</b>\n\n`;

//   const grouped = {};

//   list.forEach((t) => {
//     const seg = t.SEGMEN;

//     if (!grouped[seg]) {
//       grouped[seg] = [];
//     }

//     grouped[seg].push(t);
//   });

//   const sortedSegments =
//     Object.keys(grouped).sort(
//       (a, b) =>
//         getSegmentPriority(a) -
//         getSegmentPriority(b)
//     );

//   sortedSegments.forEach((seg) => {

//     const tickets = grouped[seg];

//     tickets.sort(
//       (a, b) =>
//         a.remaining - b.remaining
//     );

//     const sla =
//       tickets[0]?.sla || 24;

//     const slaStage =
//       tickets[0]?.slaStage || 1;

//     msg +=
//       `📌 <b>${seg}</b> ` +
//       `(${tickets.length} Tiket | ` +
//       `SLA ${sla}H`;

//     if (slaStage > 1) {
//       msg += ` | STAGE ${slaStage}`;
//     }

//     msg += `)\n`;

//     tickets.forEach((t, i) => {

//       let icon = "🟢";

//       if (t.status === "WARNING") {
//         icon = "🟡";
//       }

//       if (t.status === "CRITICAL") {
//         icon = "🟠";
//       }

//       if (t.status === "OVER SLA") {
//         icon = "🔴";
//       }

//       let extra = "";

//       if (t.BOOKING_DATE) {
//         extra +=
//           ` | ${formatDate(t.BOOKING_DATE)}`;
//       }

//       if (t.STATUS_FFG === "GUARANTEE") {
//         extra += " | FFG";
//       }

//       if (
//         t.FLAGGING_TEKNISI &&
//         t.FLAGGING_TEKNISI !==
//           "Belum terplot teknisi"
//       ) {
//         extra +=
//           ` | ${t.FLAGGING_TEKNISI}`;
//       }

//       if (t.deadline) {
//         extra +=
//           ` | ${t.deadline}`;
//       }

//       msg +=
//         `${icon} ${i + 1}. ` +
//         `<code>${t.TIKET}</code> | ` +
//         `Sisa: ${formatRemainingTime(t.remaining)} | ` +
//         `${t.STO}${extra}\n`;
//     });

//     msg += "\n";
//   });

//   msg += "━━━━━━━━━━━━━━━━━━\n";
//   msg += "⚠️ Segera lakukan ploting teknisi.\n\n";

//   return msg;
// }



// module.exports = {
//   buildMessagePloting,
// };
