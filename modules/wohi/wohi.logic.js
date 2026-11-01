const moment = require('moment-timezone');
const { classifyTicket } = require('../segmentasiTiket/segmentasi.classify.Ticket');
const normalize = value => String(value || '').trim().toUpperCase();
const normalizeBranch = value => normalize(value).replace(/^(AREA|BRANCH)\s+/, '');
function dayBounds(now) {
  const start = moment(now).tz('Asia/Jakarta').startOf('day');
  return { start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: start.clone().add(1, 'day').format('YYYY-MM-DD HH:mm:ss') };
}
function categorize(ticket) {
  const normalized = { ...ticket };
  for (const field of ['customer_segment', 'customer_type', 'service_type', 'source_ticket'])
    normalized[field] = normalize(ticket[field]);
  return classifyTicket(normalized) || 'LAINNYA';
}
function prepareTickets(rows, groups) {
  const mapping = new Map(groups.map(group => [normalize(group.WORKZONE), group]));
  const unique = new Map();
  for (const row of rows) {
    const incident = normalize(row.incident);
    if (!incident) throw new Error('WOHI_INVALID_INCIDENT');
    if (row.service_no != null && typeof row.service_no !== 'string') throw new Error('WOHI_SERVICE_MUST_BE_TEXT');
    const group = mapping.get(normalize(row.workzone));
    const ticket = { ...row, incident, WOHI_CATEGORY: categorize(row),
      WOHI_STATUS: normalize(row.status) === 'CLOSED' ? 'CLOSE' : 'OPEN',
      WOHI_BRANCH: normalizeBranch(group?.BRANCH), WOHI_SERVICE_AREA: normalize(group?.SERVICE_AREA),
      WOHI_ZONEBOT: group?.ZONEBOT || null };
    const existing = unique.get(incident);
    // Latest validator snapshot wins if a legacy source contains duplicates.
    if (!existing || String(row.updated_at || '') > String(existing.updated_at || '')) unique.set(incident, ticket);
  }
  return [...unique.values()];
}
function summarize(tickets) {
  const categories = new Map();
  const total = { open: 0, close: 0, total: 0 };
  for (const ticket of tickets) {
    const category = ticket.WOHI_CATEGORY;
    if (!categories.has(category)) categories.set(category, { category, open: 0, close: 0, total: 0 });
    const bucket = ticket.WOHI_STATUS === 'CLOSE' ? 'close' : 'open';
    categories.get(category)[bucket]++; categories.get(category).total++;
    total[bucket]++; total.total++;
  }
  return { categories: [...categories.values()].sort((a, b) => a.category.localeCompare(b.category)), total };
}
function reportMessages(branch, tickets, now) {
  const summary = summarize(tickets);
  const clean = value => String(value).replace(/[\r\n]+/g, ' ').slice(0, 100);
  const header = `📊 LAPORAN WO HI\n🏢 Branch: ${clean(branch)}\n📅 ` +
    moment(now).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm [WIB]') + '\n\n';
  const rows = summary.categories.map(row => `${clean(row.category)} | ${row.open} | ${row.close} | ${row.total}\n`);
  rows.push(`\nTOTAL | ${summary.total.open} | ${summary.total.close} | ${summary.total.total}`);
  const chunks = []; let chunk = header + 'Kategori | OPEN | CLOSE | TOTAL\n';
  for (const line of rows) {
    if (chunk.length + line.length > 3800) { chunks.push(chunk); chunk = header + 'Kategori | OPEN | CLOSE | TOTAL\n'; }
    chunk += line;
  }
  chunks.push(chunk);
  return chunks;
}
module.exports = { dayBounds, normalize, normalizeBranch, categorize, prepareTickets, summarize, reportMessages };
