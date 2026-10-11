//ttrofficer.analyzer.js

const { SEGMENT_PRIORITY, SLA_MAP } = require("../branch/branch.data");


function parseDate(input) {

  if (!input) return null;

  // support Mongo Date object
  if (input instanceof Date) {
    return input;
  }

  // support ISO string
  const parsed = new Date(input);

  if (!isNaN(parsed)) {
    return parsed;
  }

  return null;
}

function analyzeTtrOfficer(tickets) {

  const grouped = {};

  const now = new Date();

  tickets.forEach((t) => {

    if (!t.HSA) return;

    if(t.SEGMEN === "HOME PASS") return;

    const seg = (t.SEGMEN );

    const sla = SLA_MAP[seg] || 24;

    const reported = parseDate(
      t.REPORTED_DATE
    );

    if (!reported) return;

    // HITUNG SLA
    const remaining =
      sla - ((now - reported) / 3600000);

    // STATUS
    let status = "SAFE";

    if (remaining <= 0) {
      status = "OVER SLA";
    }
    else if (remaining <= 1) {
      status = "CRITICAL";
    }
    else if (remaining <= 1.5) {
      status = "WARNING";
    }

    // FILTER
    const isImportant =
      remaining <= 1.5 ||
      t.STATUS_FFG === "FFG";

    if (!isImportant) return;

    // GROUP HSA
    if (!grouped[t.HSA]) {
      grouped[t.HSA] = [];
    }





    grouped[t.HSA].push({
      ...t,
      segment: seg,
      sla,
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
  analyzeTtrOfficer,
};