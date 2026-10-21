const moment = require('moment-timezone');
const { SLA_MAPS } = require('../branch/branch.data');
const TYPES = ['GAMAS_FEEDER', 'GAMAS_GPON', 'GAMAS_DISTRIBUSI', 'GAMAS_ODP', 'GAMAS_ODC', 'GAMAS'];
const value = v => v === null || v === undefined || v === '' ? '-' : String(v);
function date(v) {
  if (!v) return '-';
  const parsed = typeof v === 'string' && !/(Z|[+-]\d\d:\d\d)$/.test(v)
    ? moment.tz(v, 'Asia/Jakarta') : moment(v).tz('Asia/Jakarta');
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : '-';
}
function ttr(ticket, now) {
  const sla = SLA_MAPS[ticket.jenis_tiket];
  const reported = ticket.reported_date;
  if (!reported || !sla || !moment(reported).isValid()) return 'Sisa: - | SLA tidak tersedia';
  const remaining = moment(reported).valueOf() + sla * 3600000 - now.valueOf();
  const minutes = Math.floor(Math.abs(remaining) / 60000);
  const time = `${remaining < 0 ? '-' : ''}${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
  const status = remaining <= 0 ? '🔴 1 OVER SLA' : remaining <= 3600000 ? '🟠 1 CRITICAL' : remaining <= 5400000 ? '🟡 1 WARNING' : '🟢 1 SAFE';
  return `Sisa: ${time} | SLA ${sla}H | ${status}`;
}
function buildGamasMessages(tickets, at = new Date()) {
  const now = moment(at).tz('Asia/Jakarta').locale('en');
  const unique = new Map();
  for (const ticket of tickets) {
    if (TYPES.includes(ticket.jenis_tiket) && ticket.incident && !unique.has(ticket.incident)) unique.set(ticket.incident, ticket);
  }
  const rows = [...unique.values()];
  const messages = [`REPORT GAMAS\n${now.format('DD MMM YYYY')} | Update : ${now.format('HH.mm')} WIB\n\nAREA 3 : ${rows.length} Gamas`];
  for (const type of TYPES) {
    const selected = rows.filter(t => t.jenis_tiket === type);
    if (!selected.length) continue;
    messages.push(type);
    const witels = [...new Set(selected.map(t => value(t.witel || t.BRANCH)))].sort();
    for (const witel of witels) {
      const group = selected.filter(t => value(t.witel || t.BRANCH) === witel).sort((a,b) => String(a.incident).localeCompare(String(b.incident)));
      messages.push(`${witel}: ${group.length} Gamas`);
      group.forEach((t,i) => messages.push(`#${i+1} ${t.incident}\n` + [
        ['Regional', t.region], ['Witel', witel], ['Workzone', t.workzone],
        ['Perangkat Terganggu', t.perangkat || t.device_name],
        ['Incident Domain', t.incident_domain], ['Actual Solution', t.description_actual_solution],
        ['Reported Date', date(t.reported_date)], ['Summary', t.summary],
        ['Last Updated Work Log', t.worklog_summary], ['Last Work Log Date', date(t.last_update_worklog)],
        ['TTR (jam)', ttr(t, now)],
      ].map(([label,v]) => `${label.padEnd(22)}: ${value(v)}`).join('\n')));
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
  return chunks.map(s => `<pre><code class="language-yaml">${escape(s)}</code></pre>`);
}
module.exports = { TYPES, buildGamasMessages, ttr, yamlChunks };
