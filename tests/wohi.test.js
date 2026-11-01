const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { dayBounds, prepareTickets, summarize, reportMessages, summarizeSources, sourceGroup } = require('../modules/wohi/wohi.logic');
const { buildWohiExcel } = require('../modules/wohi/wohi.excel');
const { createWohiSource } = require('../modules/wohi/wohi.source');
const { WohiGroups, WohiDeliveries } = require('../modules/wohi/wohi.models');
const { Groups } = require('../models/group');
const { runWohi } = require('../modules/wohi/wohi.service');
const { bindWohi, testWohi } = require('../modules/wohi/wohi.commands');
const { reportQueue, createReportQueue } = require('../core/reportQueue');
const { planReports, createReportScheduler } = require('../core/reportSchedule');
const now = new Date('2026-11-02T03:00:00Z');
const rows = [
  { incident: 'INC1', service_no: '00123', reported_date: '2026-11-02 08:00:00',
    customer_segment: 'PL-TSEL', customer_type: 'HVC_PLATINUM', status: ' closed ', workzone: 'PME', customer_name: '=1+1' },
  { incident: 'INC2', service_no: '00124', customer_segment: 'PL-TSEL',
    customer_type: 'HVC_PLATINUM', status: 'RESOLVED', workzone: 'PME' },
  { incident: 'INC3', service_no: '00125', customer_segment: 'PL-TSEL',
    customer_type: 'REGULER', status: 'BACKEND', workzone: 'PME' },
];
const mapping = [{ WORKZONE: 'PME', SERVICE_AREA: 'PAMEKASAN', BRANCH: 'BRANCH SURABAYA', ZONEBOT: 'AssistSuramadu' }];

test('WO HI day bounds respect WIB at UTC date boundary', () => {
  assert.deepEqual(dayBounds(new Date('2026-11-01T17:00:00Z')), {
    start: '2026-11-02 00:00:00', end: '2026-11-03 00:00:00',
  });
});
test('source groups keep customer categories separate and totals reconcile without duplicates', () => {
  const fixtures = [
    { ...rows[0], source_ticket: ' customer ', customer_type: 'REGULER' },
    { ...rows[1], source_ticket: 'proactive' },
    { ...rows[2], source_ticket: 'GAMAS' },
    { ...rows[2], incident: 'INC4', source_ticket: '' },
    { ...rows[2], incident: 'INC5', source_ticket: 'OTHER', status: 'CLOSED' },
  ];
  const tickets = prepareTickets(fixtures, mapping);
  const groups = summarizeSources(tickets);
  assert.deepEqual(groups.map(g => g.name), ['REGULER', 'SQM', 'GAMAS', 'SUMBER LAINNYA']);
  assert.deepEqual(groups.map(g => g.total.total), [1, 1, 1, 2]);
  assert.equal(groups[0].categories[0].category, 'REGULER');
  assert.equal(groups[0].total.close, 1); assert.equal(groups[1].total.open, 1);
  assert.equal(groups.reduce((n, group) => n + group.total.total, 0), tickets.length);
  assert.equal(sourceGroup(' PROACTIVE '), 'SQM');
  const text = reportMessages('SURABAYA', tickets, now).join('');
  for (const group of groups) assert.ok(text.includes(`📋 ${group.name}\n`));
  assert.ok(text.includes('TOTAL KESELURUHAN | 3 | 2 | 5'));
  const empty = summarizeSources([]);
  assert.deepEqual(empty.map(g => g.name), ['REGULER', 'SQM', 'GAMAS']);
  assert.ok(empty.every(g => g.total.total === 0));
});
test('grouped Excel agrees with detail rows and preserves original source_ticket', async () => {
  const tickets = prepareTickets(rows.map((row, i) => ({ ...row,
    source_ticket: ['CUSTOMER', 'PROACTIVE', 'GAMAS'][i] })), mapping);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await buildWohiExcel(tickets));
  const sheet = workbook.getWorksheet('Ringkasan');
  const subtotals = [];
  sheet.eachRow((row, number) => { if (number > 1 && row.getCell(2).value === 'TOTAL')
    subtotals.push([row.getCell(1).value, row.getCell(5).value]); });
  assert.deepEqual(subtotals, [['REGULER', 1], ['SQM', 1], ['GAMAS', 1]]);
  assert.equal(sheet.lastRow.getCell(5).value, 3);
  const details = workbook.getWorksheet('Semua Tiket'), headers = details.getRow(1).values;
  assert.equal(details.getRow(3).getCell(headers.indexOf('WOHI_SOURCE_GROUP')).value, 'SQM');
  assert.equal(details.getRow(3).getCell(headers.indexOf('source_ticket')).value, 'PROACTIVE');
});
test('long grouped summaries retain source context and each category exactly once', () => {
  const tickets = Array.from({ length: 150 }, (_, i) => ({ source_ticket: 'PROACTIVE',
    WOHI_CATEGORY: `CATEGORY_${String(i).padStart(3, '0')}_${'X'.repeat(40)}`, WOHI_STATUS: 'OPEN' }));
  const chunks = reportMessages('SURABAYA', tickets, now);
  assert.ok(chunks.length > 1); assert.ok(chunks.every(chunk => chunk.length <= 3800));
  assert.equal((chunks.join('').match(/CATEGORY_\d{3}_/g) || []).length, 150);
  for (const chunk of chunks) if (chunk.includes('CATEGORY_')) assert.ok(chunk.includes('📋 SQM'));
});
test('only CLOSED counts as CLOSE; categories retain all rows without SLA', () => {
  const more = ['MEDIACARE', 'SALAMSIM', 'RESOLVED', '', 'UNKNOWN'].map((status, i) =>
    ({ ...rows[2], incident: `EXTRA${i}`, status }));
  const tickets = prepareTickets([...rows, ...more], mapping);
  const result = summarize(tickets);
  assert.deepEqual(result.total, { open: 7, close: 1, total: 8 });
  assert.deepEqual(result.categories.find(c => c.category === 'HVC_PLATINUM'),
    { category: 'HVC_PLATINUM', open: 1, close: 1, total: 2 });
  const text = reportMessages('SURABAYA', tickets, now).join('');
  assert.ok(text.includes('TOTAL | 7 | 1 | 8')); assert.ok(!text.includes('SLA'));
});
test('unknown categories retained, duplicates use latest source row, service numbers never coerced', () => {
  const ticket = { incident: 'INC4', service_no: '00', status: 'OPEN', workzone: 'PME', updated_at: '2026-11-02 08:00:00' };
  const prepared = prepareTickets([ticket, { ...ticket, status: 'CLOSED', updated_at: '2026-11-02 09:00:00' }], mapping);
  assert.equal(prepared.length, 1); assert.equal(prepared[0].WOHI_CATEGORY, 'LAINNYA');
  assert.equal(prepared[0].WOHI_STATUS, 'CLOSE');
  assert.throws(() => prepareTickets([{ ...ticket, service_no: 123 }], mapping));
});
test('MySQL source is read-only and selects full day without a status filter', async () => {
  const keys = ['HOST', 'USER', 'PASSWORD', 'DATABASE']; const saved = {};
  for (const prefix of ['FFG', 'WOHI']) for (const key of keys) {
    const name = `${prefix}_MYSQL_${key}`; saved[name] = process.env[name];
    if (prefix === 'FFG') process.env[name] = 'fixture'; else delete process.env[name];
  }
  let destroyed = false;
  try {
    const source = createWohiSource({ createConnection: async () => ({
      execute: async (query, params) => {
        assert.ok(query.sql.includes('SELECT * FROM piloting_tickets'));
        assert.ok(!query.sql.includes('status'));
        assert.deepEqual(params, ['2026-11-02 00:00:00', '2026-11-03 00:00:00']); return [rows];
      }, destroy: () => { destroyed = true; },
    }) });
    assert.equal(await source.fetchToday(now), rows); assert.equal(destroyed, true);
  } finally { for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  } }
});
test('Excel summary equals detail totals and preserves textual service and literal strings', async () => {
  const bytes = await buildWohiExcel(prepareTickets(rows, mapping));
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
  const summary = workbook.getWorksheet('Ringkasan'), details = workbook.getWorksheet('Semua Tiket');
  assert.equal(details.rowCount, 4);
  assert.equal(summary.lastRow.getCell(5).value, 3);
  assert.equal(summary.lastRow.getCell(3).value, 2);
  const headers = details.getRow(1).values;
  assert.equal(details.getRow(2).getCell(headers.indexOf('service_no')).value, '00123');
  assert.equal(details.getRow(2).getCell(headers.indexOf('customer_name')).value, '=1+1');
  assert.ok(headers.includes('WOHI_CATEGORY') && headers.includes('WOHI_STATUS'));
});
test('WO HI sends text/Excel to bound branches and records uncertain delivery without replay', async () => {
  const saved = { groups: WohiGroups.find, map: Groups.find, create: WohiDeliveries.create, update: WohiDeliveries.updateOne };
  const keys = new Set(), states = []; let sent = 0, documents = 0, fail = false;
  WohiGroups.find = () => ({ lean: async () => [
    { BRANCH: 'SURABAYA', ID_GRUP: 'TEST', ID_TOPIC_GRUP: '2' },
    { BRANCH: 'MALANG', ID_GRUP: 'OTHER' },
  ] });
  Groups.find = () => ({ lean: async () => mapping });
  WohiDeliveries.create = async doc => { if (keys.has(doc._id)) throw { code: 11000 }; keys.add(doc._id); };
  WohiDeliveries.updateOne = async (filter, update) => { states.push(update.$set); };
  const runtime = { source: { fetchToday: async () => rows }, getBotByZone: async () => ({ telegram: {
    sendMessage: async (chat, text, options) => { assert.equal(chat, 'TEST'); assert.equal(options.message_thread_id, 2); sent++; },
    sendDocument: async () => { if (fail) throw { code: 'ETIMEDOUT' }; documents++; },
  } }) };
  try {
    const result = await runWohi(now, runtime);
    assert.equal(result.sent, 1); assert.equal(result.skipped, 1);
    assert.equal(sent, 1); assert.equal(documents, 1);
    await runWohi(now, runtime); assert.equal(sent, 1);
    fail = true;
    const failed = await runWohi(now, { ...runtime, trigger: 'manual', requestId: 'private:1' });
    assert.equal(failed.failed, 1); assert.equal(states.at(-1).failed_stage, 'sendDocument');
    assert.equal(states.at(-1).sent_messages, 1); assert.equal(states.at(-1).error_code, 'ETIMEDOUT');
  } finally { WohiGroups.find = saved.groups; Groups.find = saved.map;
    WohiDeliveries.create = saved.create; WohiDeliveries.updateOne = saved.update; }
});
test('binding captures group topic and manual command is private-only and queued', async () => {
  let record, ran = false; const replies = [];
  const ctx = { chat: { type: 'supergroup', id: -100, title: 'WO HI test' },
    message: { text: '/wohi_SURABAYA@TestBot', message_thread_id: 5, message_id: 1 },
    botInfo: { id: 1 }, reply: async text => { replies.push(text); } };
  await bindWohi(ctx, { findOne: () => ({ lean: async () => null }), create: async doc => { record = doc; } });
  assert.equal(record.BRANCH, 'SURABAYA'); assert.equal(record.ID_TOPIC_GRUP, '5');
  const runner = async () => { ran = true; return { sent: 1, failed: 0, skipped: 0 }; };
  await testWohi(ctx, runner); assert.equal(ran, false);
  ctx.chat.type = 'private'; await testWohi(ctx, runner);
  await reportQueue.idle(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(ran, true); assert.ok(replies.at(-1).includes('Berhasil: 1'));
});
test('two-hour WO HI is optional, after FFG, and retains original scheduled day', async () => {
  assert.equal(planReports(now, false, true).wohiDue, true);
  assert.equal(planReports(new Date(+now + 900000), true, true).wohiDue, false);
  assert.equal(planReports(now, true).wohiDue, false);
  const events = [];
  const scheduler = createReportScheduler({ ffg: async mode => events.push(mode),
    wohi: async date => { assert.equal(date.toISOString(), now.toISOString()); events.push('wohi'); } },
  createReportQueue({ log() {} }));
  await scheduler.requestSchedulerJob({ scheduledAt: now, operational: false,
    label: 'TEST', ffgActive: true, ffgHourly: true, wohiDue: true });
  assert.deepEqual(events, ['active', 'hourly', 'wohi']);
});
test('WO HI fires only at even WIB hours; midnight selects previous day across calendar boundaries', async () => {
  for (let hour = 0; hour < 24; hour++) for (const minute of [0, 15, 30, 45]) {
    const date = new Date(Date.UTC(2026, 10, 2, hour - 7, minute));
    assert.equal(planReports(date, true, true).wohiDue, hour % 2 === 0 && minute === 0);
    assert.equal(planReports(date, true, false).wohiDue, false);
  }
  for (const [timestamp, expected] of [
    ['2026-11-02T17:00:00Z', '2026-11-02 00:00:00'],
    ['2026-10-31T17:00:00Z', '2026-10-31 00:00:00'],
    ['2026-12-31T17:00:00Z', '2026-12-31 00:00:00'],
  ]) {
    const date = new Date(timestamp);
    let received;
    const scheduler = createReportScheduler({ wohi: async (scheduledAt, runtime) => {
      received = { scheduledAt, runtime };
    } }, createReportQueue({ log() {} }));
    await scheduler.requestSchedulerJob({ ...planReports(date, false, true), operational: false });
    assert.equal(received.scheduledAt.toISOString(), date.toISOString());
    assert.equal(dayBounds(received.runtime.reportDate).start, expected);
    const message = reportMessages('SURABAYA', prepareTickets(rows, mapping), date, received.runtime.reportDate).join('');
    assert.ok(message.includes('00:00 WIB'));
  }
});
