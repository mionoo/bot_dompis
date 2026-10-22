const moment = require('moment-timezone');
const { normalizeBranchName } = require('../branch/branch.data');
const TYPES = ['GAMAS_FEEDER', 'GAMAS_GPON', 'GAMAS_DISTRIBUSI', 'GAMAS_ODP', 'GAMAS_ODC', 'GAMAS'];
// BRANCH berasal dari mapping workzone -> groups pada pipeline segmentasi.
const branchName = v => normalizeBranchName(String(v || '').replace(/^AREA\s*/i, '')) || '-';
const value = v => v === null || v === undefined || v === '' ? '-' : String(v);
function date(v) {
  if (!v) return '-';
  const parsed = typeof v === 'string' && !/(Z|[+-]\d\d:\d\d)$/.test(v)
    ? moment.tz(v, 'Asia/Jakarta') : moment(v).tz('Asia/Jakarta');
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss [WIB]') : '-';
}
function ttr(ticket, now) {
  if (!ticket.reported_date) return '-';
  const reported = typeof ticket.reported_date === 'string'
    ? moment(ticket.reported_date, moment.ISO_8601, true) : moment(ticket.reported_date);
  if (!reported.isValid()) return '-';
  const hours = (now.valueOf() - reported.valueOf()) / 3600000;
  return hours < 0 || !Number.isFinite(hours) ? '-' : hours.toFixed(2);
}
function buildGamasMessages(tickets, at = new Date()) {
  const now = moment(at).tz('Asia/Jakarta').locale('en');
  const unique = new Map();
  for (const ticket of tickets) {
    if (TYPES.includes(ticket.jenis_tiket) && ticket.incident && !unique.has(ticket.incident)) unique.set(ticket.incident, ticket);
  }
  const rows = [...unique.values()];
  const messages = [`REPORT GAMAS\n${now.format('DD MMM YYYY')} | Update : ${now.format('HH.mm')} WIB\n\nAREA 3 : ${rows.length} Gamas`];
  const branches = [...new Set(rows.map(t => branchName(t.BRANCH)))].sort();
  for (const branch of branches) {
    const branchTickets = rows.filter(t => branchName(t.BRANCH) === branch);
    messages.push(`${branch}: ${branchTickets.length} Gamas`);
    let number = 0;
    for (const type of TYPES) {
      const group = branchTickets.filter(t => t.jenis_tiket === type)
        .sort((a,b) => String(a.incident).localeCompare(String(b.incident)));
      for (const t of group) {
        const label = type.replace(/_/g, ' - ');
        messages.push(`#${++number} ${t.incident} | ${label}\n` + [
          ['BRANCH', branch], ['Workzone', t.workzone],
          ['Perangkat Terganggu', t.perangkat || t.device_name],
          ['Incident Domain', t.incident_domain], ['Actual Solution', t.description_actual_solution],
          ['Summary', t.summary],
          ['Last Updated Work Log', t.worklog_summary], ['Last Work Log Date', date(t.last_update_worklog)],
          ['Reported Date', date(t.reported_date)],
          ['TTR (jam)', ttr(t, now)],
        ].map(([label,v]) => `${label.padEnd(22)}: ${value(v)}`).join('\n'));
      }
    }
  }
  return messages;
}
// Split before adding HTML wrappers, including single oversized lines and emoji.
function yamlChunks(message, max = 3500) {
  const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chunks = [];
  let chunk = '';
  for (const char of message) {
    if ((chunk + char).length > max) { chunks.push(chunk); chunk = ''; }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map(s => `<pre>${escape(s)}</pre>`);
}
module.exports = { TYPES, buildGamasMessages, ttr, yamlChunks };
