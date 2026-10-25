const moment = require("moment-timezone");
const { Tickets, State, Deliveries, FfgGroups } = require("./ffg.models");
const { Groups } = require("../../models/group");
const { active, normalize, sla, dayRange } = require("./ffg.logic");
const { buildExcel } = require("./ffg.excel");
const { activeMessages } = require("./ffg.formatter");
const normalizeBranch = (value) =>
  normalize(value)
    .replace(/^(AREA|BRANCH)\s+/, "")
    .trim();

function messages(area, tickets, mode, now) {
  if (mode !== "hourly") return activeMessages(area, tickets, now);
  const header =
    `FFG ${mode === "hourly" ? "REKAP HARI INI" : "OPEN + SLA"}\n${area}\n` +
    moment(now).tz("Asia/Jakarta").format("DD-MM-YYYY HH:mm [WIB]") +
    `\nTotal: ${tickets.length}\n`;
  const chunks = [];
  let chunk = header;
  for (const ticket of tickets) {
    const value = sla(ticket, now);
    const line =
      `\n${ticket.incident} | ${ticket.service_no}\n` +
      `${String(ticket.customer_name || "-").slice(0, 120)} | ${ticket.workzone}\n` +
      `Status: ${ticket.status}\nSLA: ${value.label}` +
      (value.target
        ? ` | ${value.target} jam | sisa ${value.remaining.toFixed(2)} jam`
        : "") +
      "\n";
    if (chunk.length + line.length > 3800) {
      chunks.push(chunk);
      chunk = header;
    }
    chunk += line;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

async function runFfg(mode, now = new Date(), runtime = {}) {
  const summary = { sent: 0, failed: 0, skipped: 0, reason: null };
  const trigger = runtime.trigger === 'manual' ? 'manual' : 'schedule';
  const errorCode = error => {
    const code = error?.response?.error_code ?? error?.code ?? error?.cause?.code ?? error?.name;
    return typeof code === 'number' ? String(code) : /^[A-Za-z0-9_]{1,64}$/.test(String(code)) ? String(code) : 'ERROR';
  };
  const checkedAt = runtime.checkedAt || now;
  const sync = await State.findById("sync").lean();
  const maxAge = Number(process.env.FFG_MAX_SYNC_AGE_SECONDS || 600) * 1000;
  if (!sync?.completed_at || checkedAt - sync.completed_at > maxAge) {
    console.warn("FFG report skipped: source synchronization is not fresh");
    summary.reason = 'STALE_SYNC';
    return summary;
  }
  const range = dayRange(now);
  const query =
    mode === "hourly"
      ? { reported_at: { $gte: range.start, $lt: range.end } }
      : {};
  let tickets = await Tickets.find(query)
    .sort({ reported_at: 1, incident: 1 })
    .lean();
  // Per-document freshness also protects missing incidents and partial scans.
  tickets = tickets.filter(
    (t) =>
      !t.sync_error &&
      t.synced_at &&
      // CLOSE snapshots are final and remain eligible for the hourly report.
      ((mode === "hourly" && t.status_validasi === "CLOSE") ||
        checkedAt - t.synced_at <= maxAge) &&
      (mode === "hourly" || (t.status_validasi === "OPEN" && active(t))),
  );
  const groups = await FfgGroups.find({ STATUS: "ACTIVE" }).lean();
  const mapping = await Groups.find({}).lean();
  const workzones = new Map(mapping.map((g) => [normalize(g.WORKZONE), g]));
  const unmapped = tickets.filter((t) => !workzones.get(t.workzone)?.BRANCH);
  if (unmapped.length)
    console.warn(`FFG: ${unmapped.length} tickets have no branch mapping`);
  const slot = moment(now).tz("Asia/Jakarta").startOf("hour");
  if (mode !== "hourly")
    slot.minute(Math.floor(moment(now).minute() / 15) * 15);
  const getBotByZone =
    runtime.getBotByZone || require("../../core/globalSender").getBotByZone;
  for (const group of groups) {
    const area = normalizeBranch(group.BRANCH);
    if (!area) { summary.skipped++; continue; }
    const list = tickets
      .filter(
        (t) => normalizeBranch(workzones.get(t.workzone)?.BRANCH) === area,
      )
      .map((t) => ({
        ...t,
        HSA: normalize(workzones.get(t.workzone)?.SERVICE_AREA),
      }));
    if (!list.length) { summary.skipped++; continue; }
    const zone = mapping.find(
      (g) => normalizeBranch(g.BRANCH) === area,
    )?.ZONEBOT;
    if (!zone) {
      console.warn(`FFG: no bot mapping for ${area}`);
      summary.skipped++;
      continue;
    }
    const key = `${trigger === "manual" ? `manual:${runtime.requestId}:` : ""}${mode}:${slot.toISOString()}:${group.ID_GRUP}:${group.ID_TOPIC_GRUP || ""}:${area}`;
    try {
      await Deliveries.create({
        _id: key,
        status: "SENDING",
        started_at: new Date(), report_type: mode, trigger,
        branch: area, chat_id: group.ID_GRUP, topic_id: group.ID_TOPIC_GRUP || null,
        ticket_count: list.length, sent_messages: 0, attachment_sent: false,
      });
    } catch (error) {
      if (error.code === 11000) { summary.skipped++; continue; }
      throw error;
    }
    let stage = 'buildExcel';
    let sentMessages = 0, attachmentSent = false;
    const messageIds = [];
    try {
      const excel = mode === 'hourly' ? await (runtime.buildExcel || buildExcel)(list, now) : null;
      stage = 'resolveBot';
      const bot = await getBotByZone(zone);
      const options = group.ID_TOPIC_GRUP
        ? { message_thread_id: Number(group.ID_TOPIC_GRUP) }
        : {};
      // Use the same bot/area routing as TTR. Its text sender swallows errors,
      // so FFG calls Telegram directly to record uncertain delivery accurately.
      const reportMessages = messages(area, list, mode, now);
      for (const message of reportMessages) {
        stage = 'sendMessage';
        const response = await bot.telegram.sendMessage(group.ID_GRUP, message, options);
        sentMessages++;
        if (response?.message_id) messageIds.push(response.message_id);
        stage = 'recordProgress';
        await Deliveries.updateOne({ _id: key }, { $set: { sent_messages: sentMessages, message_ids: messageIds } });
      }
      if (excel) {
        stage = 'sendDocument';
        const response = await bot.telegram.sendDocument(
          group.ID_GRUP,
          {
            source: excel,
            filename: `FFG-${area.replace(/[^A-Z0-9_-]/g, "_")}-${slot.format("YYYYMMDD-HHmm")}.xlsx`,
          },
          options,
        );
        attachmentSent = true;
        if (response?.message_id) messageIds.push(response.message_id);
      }
      stage = 'saveStatus';
      await Deliveries.updateOne(
        { _id: key },
        { $set: { status: "SENT", completed_at: new Date(), sent_messages: sentMessages,
          message_ids: messageIds, attachment_sent: attachmentSent } },
      );
      summary.sent++;
      console.log(
        `✅ FFG ${mode === "hourly" ? "rekap 1 jam" : "15 menit"} terkirim | ` +
          `${area} | ${trigger} | ${list.length} tiket | ${reportMessages.length} pesan` +
          (excel ? " | Excel" : "") +
          ` | grup ${group.ID_GRUP} | topik ${group.ID_TOPIC_GRUP || "-"} | ` +
          moment(now).tz("Asia/Jakarta").format("DD/MM/YYYY HH:mm [WIB]"),
      );
    } catch (error) {
      summary.failed++;
      const code = errorCode(error);
      const details = { status: 'UNKNOWN', report_type: mode, trigger,
        failed_stage: stage, error_code: code, sent_messages: sentMessages,
        message_ids: messageIds, attachment_sent: attachmentSent,
        failed_at: new Date(), last_error: `${stage}: ${code}; inspect Telegram before retry` };
      const retryAfter = error?.response?.parameters?.retry_after;
      if (Number.isFinite(retryAfter)) details.retry_after = retryAfter;
      console.warn(`FFG gagal | ${mode} | ${trigger} | ${area} | grup ${group.ID_GRUP} | ` +
        `topik ${group.ID_TOPIC_GRUP || '-'} | tahap ${stage} | kode ${code} | ` +
        `pesan terkirim ${sentMessages} | Excel ${attachmentSent}`);
      try { await Deliveries.updateOne({ _id: key }, { $set: details }); }
      catch (saveError) { console.warn(`FFG pencatatan gagal | ${mode} | ${area} | ${errorCode(saveError)}`); }
    }
  }
  if (!groups.length) summary.reason = "NO_BINDINGS";
  return summary;
}
module.exports = { runFfg, messages, normalizeBranch };
