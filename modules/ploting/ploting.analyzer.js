// // ploting.analyzer.js


const moment = require("moment-timezone");
const {
  SEGMENT_PRIORITY,
  SLA_MAP,
  SLA_MAPS
} = require("../branch/branch.data");


function parseDate(input) {
  if (!input) return null;

  const parsed = moment.utc(input);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed;
}


// ======================================================
// ACTIVE SLA
// ======================================================

function getActiveSla(seg, elapsedHours) {

  const config =
    SLA_MAPS[seg] || 24;


  // SLA biasa
  if (!Array.isArray(config)) {

    return {
      sla: config,
      stage: 1,
    };

  }


  // SLA bertingkat
  let stage = 1;

  for (
    let i = 0;
    i < config.length - 1;
    i++
  ) {

    if (elapsedHours >= config[i]) {
      stage = i + 2;
    }

  }


  return {
    sla: config[stage - 1],
    stage,
  };
}


// ======================================================
// ANALYZE
// ======================================================

function analyzePloting(tickets) {

  const grouped = {};

  const now = new Date();


  tickets.forEach((t) => {

    if (!t.HSA) {
      return;
    }


    // Sudah terplot teknisi
    if (
      t.FLAGGING_TEKNISI &&
      t.FLAGGING_TEKNISI !== ""
    ) {
      return;
    }


    const reported =
      parseDate(
        t.REPORTED_DATE
      );


    if (
      !reported ||
      isNaN(reported)
    ) {
      return;
    }


    // ================================================
    // ELAPSED
    // ================================================

    const elapsed =
      (now - reported) /
      3600000;


    // ================================================
    // SLA
    // ================================================

    const {
      sla,
      stage: slaStage,
    } = getActiveSla(
      t.SEGMEN,
      elapsed
    );


    // ================================================
    // REMAINING
    // ================================================

    const remaining =
      sla - elapsed;


    // ================================================
    // STATUS
    // ================================================

    let status = "SAFE";

    if (remaining <= 0) {

      status = "OVER SLA";

    } else if (remaining <= 1) {

      status = "CRITICAL";

    } else if (remaining <= 1.5) {

      status = "WARNING";

    }


    // ================================================
    // GROUP HSA
    // ================================================

    if (!grouped[t.HSA]) {
      grouped[t.HSA] = [];
    }


    grouped[t.HSA].push({
      ...t,

      elapsed,
      sla,
      slaStage,
      remaining,
      status,
    });

  });


  return grouped;
}


module.exports = {
  analyzePloting,
  getActiveSla,
};




// const { SEGMENT_PRIORITY, SLA_MAP, SLA_MAPS } = require("../branch/branch.data");

// function parseDate(date) {
//   if (!date) return null;

//   return new Date(date);
// }

// function getActiveSla(seg, elapsedHours) {
//   const config = SLA_MAP[seg] || 24;

//   if (!Array.isArray(config)) {
//     return {
//       sla: config,
//       stage: 1,
//     };
//   }

//   let stage = 1;

//   for (let i = 0; i < config.length - 1; i++) {
//     if (elapsedHours >= config[i]) {
//       stage = i + 2;
//     }
//   }

//   return {
//     sla: config[stage - 1],
//     stage,
//   };
// }

// function analyzePloting(tickets) {
//   const grouped = {};
//   const now = new Date();

//   tickets.forEach((t) => {
//     if (!t.HSA) return;
//     if (t.FLAGGING_TEKNISI && t.FLAGGING_TEKNISI !== "") {
//       return;
//     }

//     // console.log(
//     //   `Analyzing ticket ${t.TIKET} with segment ${t.SEGMEN} in area ${t.HSA}`,
//     // );

//     const sla = SLA_MAP[t.SEGMEN] || 6;

//     const reported = parseDate(t.REPORTED_DATE);

//     //console.log(`Reported date for ticket ${t.TIKET}:`, reported);

//     if (!reported || isNaN(reported)) return;

//     const elapsed = (now - reported) / 3600000;
//     const remaining = sla - elapsed;

//     let status = "SAFE";

//     if (remaining <= 0) status = "OVER SLA";
//     else if (remaining <= 1) status = "CRITICAL";
//     else if (remaining <= 1.5) status = "WARNING";

//     if (!grouped[t.HSA]) grouped[t.HSA] = [];


//     grouped[t.HSA].push({
//       ...t,
//       sla,
//       remaining,
//       status,
//     });
//   });

//   return grouped;
// }

// module.exports = { analyzePloting };
