// ttr.analyzer.js

const moment = require("moment-timezone");

const { SLA_MAPS } =
  require("../branch/branch.data");

function parseDate(date) {
  if (!date) return null;

  const parsed = moment.utc(date);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed;
}

function analyzeTTR(tickets) {
  const grouped = {};

  // 🔥 FIX UTC
  const now = moment.utc();

  tickets.forEach((t) => {
    if (!t.HSA) return;

    const sla =
      SLA_MAPS[t.SEGMEN] || 24;

    const reported =
      parseDate(t.REPORTED_DATE);

    if (!reported) return;

    // =========================
    // ELAPSED HOURS
    // =========================
    const elapsedHours =
      now.diff(reported, "hours", true);

    // =========================
    // REMAINING
    // =========================
    const remaining =
      sla - elapsedHours;

    

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

    if (!grouped[t.HSA]) {
      grouped[t.HSA] = [];
    }

    grouped[t.HSA].push({
      ...t,
      sla,
      remaining,
      status,
    });
  });

  return grouped;
}

module.exports = {
  analyzeTTR,
};
