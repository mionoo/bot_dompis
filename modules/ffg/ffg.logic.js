const moment = require("moment-timezone");
const { SLA_MAPS } = require("../branch/branch.data");
const {
  classifyTicket,
} = require("../segmentasiTiket/segmentasi.classify.Ticket");
const STOP = ["CLOSED", "RESOLVED", "MEDIACARE", "SALAMSIM"];
const normalize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
function active(ticket) {
  const status = normalize(ticket.status);
  return (
    Boolean(status) &&
    !STOP.includes(status) &&
    !["UNKNOWN", "STATUS"].includes(status)
  );
}
function sourceDate(value) {
  if (!value) return null;
  const parsed = moment.tz(value, "YYYY-MM-DD HH:mm:ss", true, "Asia/Jakarta");
  return parsed.isValid() ? parsed.toDate() : null;
}
function sla(ticket, now = new Date()) {
  const segment =
    classifyTicket(ticket) || normalize(ticket.customer_type) || "REGULER";
  const start = ticket.reported_at && new Date(ticket.reported_at);
  const stop = active(ticket) ? now : ticket.stopped_at;
  if (!start || !stop) return { segment, label: "WAKTU SLA BELUM TERSEDIA" };
  const elapsed = (new Date(stop) - start) / 3600000;
  if (!Number.isFinite(elapsed) || elapsed < 0)
    return { segment, label: "WAKTU SLA TIDAK VALID" };
  const config = SLA_MAPS[segment] || 24;
  let stage = 1;
  if (Array.isArray(config)) {
    for (let i = 1; i < config.length; i++)
      if (elapsed >= config[i - 1]) stage = i + 1;
  }
  const target = Array.isArray(config) ? config[stage - 1] : config;
  const remaining = target - elapsed;
  const label =
    remaining <= 0
      ? "OVER SLA"
      : remaining <= 1
        ? "CRITICAL"
        : remaining <= 1.5
          ? "WARNING"
          : "SAFE";
  return { segment, target, stage, elapsed, remaining, label };
}
function dayRange(now = new Date()) {
  const start = moment(now).tz("Asia/Jakarta").startOf("day");
  return { start: start.toDate(), end: start.clone().add(1, "day").toDate() };
}
function validateResults(data, services) {
  if (data?.success !== true || !Array.isArray(data.results))
    throw new Error("Invalid FFG response");
  const results = new Map();
  for (const result of data.results) {
    if (
      typeof result?.service_no !== "string" ||
      typeof result.match !== "boolean" ||
      !services.includes(result.service_no) ||
      results.has(result.service_no)
    )
      throw new Error("Invalid FFG result");
    results.set(result.service_no, result);
  }
  if (results.size !== services.length)
    throw new Error("Incomplete FFG response");
  return results;
}
function snapshot(row, now = new Date()) {
  if (typeof row.service_no !== "string")
    throw new Error("service_no must be text");
  const stopped = STOP.includes(normalize(row.status));
  return {
    incident: row.incident,
    service_no: row.service_no.trim(),
    status: normalize(row.status),
    status_validasi: normalize(row.status_validasi),
    reported_at: sourceDate(row.reported_date),
    stopped_at: stopped
      ? sourceDate(row.status_date) || sourceDate(row.resolve_date)
      : null,
    source_updated_at: sourceDate(row.updated_at),
    synced_at: now,
    workzone: normalize(row.workzone),
    customer_name: row.customer_name,
    customer_segment: row.customer_segment,
    customer_type: row.customer_type,
    service_type: row.service_type,
    source_ticket: row.source_ticket,
    summary: row.summary,
    ticket: row,
  };
}
module.exports = {
  STOP,
  normalize,
  active,
  sourceDate,
  sla,
  dayRange,
  validateResults,
  snapshot,
};
