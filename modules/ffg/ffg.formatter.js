const moment = require('moment-timezone');
const { SEGMENT_PRIORITY } = require('../branch/branch.data');
const { sla, sourceDate, normalize } = require('./ffg.logic');
const clean = value => String(value || '-').replace(/[\r\n]+/g, ' ').slice(0, 120);
function remainingTime(hours) {
  if (!Number.isFinite(hours)) return '-';
  const minutes = Math.floor(hours * 60);
  const absolute = Math.abs(minutes);
  return `${minutes < 0 ? '-' : ''}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`;
}
function activeMessages(branch, tickets, now) {
  if (!tickets.length) return [];
  const title = `🚨 FFG OPEN + SLA\n🏢 Branch: ${clean(branch)}\n🕒 ` +
    moment(now).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm [WIB]') +
    `\nTotal Tiket FFG: ${tickets.length}\n\n`;
  const hsas = new Map();
  for (const ticket of tickets) {
    const hsa = clean(ticket.HSA || 'HSA BELUM DIPETAKAN');
    if (!hsas.has(hsa)) hsas.set(hsa, []);
    hsas.get(hsa).push({ ticket, value: sla(ticket, now) });
  }
  const chunks = []; let chunk = title;
  for (const [hsa, rows] of [...hsas.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const hsaHeader = `📍 HSA: ${hsa}\nTotal Tiket : ${rows.length}\n\n`;
    const segments = new Map();
    for (const row of rows) {
      const key = `${row.value.segment}:${row.value.stage || 1}`;
      if (!segments.has(key)) segments.set(key, []);
      segments.get(key).push(row);
    }
    let firstSegment = true;
    const sorted = [...segments.values()].sort((a, b) =>
      (SEGMENT_PRIORITY[a[0].value.segment] || 99) - (SEGMENT_PRIORITY[b[0].value.segment] || 99) ||
      a[0].value.segment.localeCompare(b[0].value.segment) ||
      (a[0].value.stage || 1) - (b[0].value.stage || 1));
    for (const list of sorted) {
      const over = list.filter(row => row.value.label === 'OVER SLA').length;
      const first = list[0].value;
      const section = `📌 ${clean(first.segment)} (${list.length} tiket | SLA ${first.target || '-'}H` +
        (over ? ` | 🔴 ${over} OVER SLA` : '') + ')\n';
      list.sort((a, b) => (a.value.remaining ?? Infinity) - (b.value.remaining ?? Infinity) ||
        String(a.ticket.incident).localeCompare(String(b.ticket.incident)));
      let prefix = (firstSegment ? hsaHeader : '\n') + section;
      for (const { ticket, value } of list) {
        const icon = { SAFE: '🟢', WARNING: '🟡', CRITICAL: '🟠', 'OVER SLA': '🔴' }[value.label] || '⚪';
        const booking = sourceDate(ticket.ticket?.booking_date);
        const sqm = normalize(ticket.source_ticket || ticket.ticket?.source_ticket) === 'PROACTIVE' ? ' | SQM' : '';
        const line = `${icon} ${clean(ticket.incident)}${sqm} | Sisa: ${remainingTime(value.remaining)} | ${clean(ticket.workzone)}` +
          (booking ? ` | ${moment(booking).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}` : '') +
          (!Number.isFinite(value.remaining) ? ` | ${value.label}` : '') + '\n';
        if (chunk.length + prefix.length + line.length > 3800) {
          chunks.push(chunk); chunk = title; prefix = hsaHeader + section;
        }
        chunk += prefix + line; prefix = '';
      }
      firstSegment = false;
    }
    const separator = '\n━━━━━━━━━━━━━━━━━━\n\n';
    if (chunk.length + separator.length <= 3800) chunk += separator;
  }
  if (chunk !== title) chunks.push(chunk);
  return chunks;
}
module.exports = { activeMessages, remainingTime };
