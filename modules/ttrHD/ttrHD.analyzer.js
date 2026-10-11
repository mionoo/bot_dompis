//ttrb2b.analyzer.js
const moment = require("moment-timezone");

const {
  SEGMENT_PRIORITY,
  SLA_MAP,
  SLA_MAPS,
  SEGMENT_B2B,
} = require("../branch/branch.data");

function parseDate(input) {
  if (!input) return null;

  const parsed = moment.utc(input);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed;
}

function getActiveSla(seg, elapsedHours) {
  const config = SLA_MAPS[seg] || 24;

  if (!Array.isArray(config)) {
    return {
      sla: config,
      stage: 1,
    };
  }

  let stage = 1;

  for (let i = 1; i < config.length; i++) {
    if (elapsedHours >= config[i - 1]) {
      stage = i + 1;
    }
  }

  return {
    sla: config[stage - 1],
    stage,
  };
}

function analyzeTtrHD(tickets) {
  const grouped = {};

  // 🔥 FIX UTC
  const now = moment.utc();

  tickets.forEach((t) => {
    if (!t.HSA) return;

    const seg = t.SEGMEN;

    //    if (seg === "HVC_GOLD" || seg === "REGULER") return;

    const reported = parseDate(t.REPORTED_DATE);

    if (!reported) return;

    const elapsedHours = now.diff(reported, "hours", true);

    const { sla, stage: slaStage } = getActiveSla(seg, elapsedHours);

    const remaining = sla - elapsedHours;

    // =========================
    // STATUS
    // =========================
    let status = "SAFE";

    if (remaining <= 0) {
      status = "OVER SLA";
    } else if (remaining <= 1) {
      status = "CRITICAL";
    } else if (remaining <= 1.5) {
      status = "WARNING";
    }

    // =========================
    // FILTER¸¸¸¸
    // =========================


    // if (!isImportant) return;
    if (!Object.prototype.hasOwnProperty.call(SEGMENT_PRIORITY, seg)) {
      return;
    }

    // =========================
    // GROUP HSA
    // =========================
    if (!grouped[t.HSA]) {
      grouped[t.HSA] = [];
    }

    grouped[t.HSA].push({
      ...t,
      segment: seg,
      sla,
      slaStage,
      elapsedHours,
      remaining,
      status,
      tiket: t.TIKET,
      sto: t.STO,
      ffg: t.STATUS_FFG,
      reported: t.REPORTED_DATE,
    });
  });

  return grouped;
}

module.exports = {
  analyzeTtrHD,
};
