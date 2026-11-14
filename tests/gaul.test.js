const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareReminder, reminderMessages } = require('../modules/gaul/gaul.service');
const { planReports, createReportScheduler } = require('../core/reportSchedule');
const { createReportQueue } = require('../core/reportQueue');

test('GAUL uses authoritative status, MySQL mapping fallback and tags matching PIC once', () => {
  const tracked = { service_no: '00123', previous_incident: 'OLD', previous_reported_date: '2026-08-20 10:00:00' };
  const current = { incident: 'NEW', service_no: '00123', status: 'BACKEND', reported_date: '2026-11-14 09:00:00', workzone: 'PME' };
  const group = { SERVICE_AREA: 'PAMEKASAN', BRANCH: 'SURABAYA', ZONEBOT: 'AssistSuramadu' };
  assert.equal(prepareReminder(tracked, null, null, group), null);
  assert.equal(prepareReminder(tracked, { ...current, status: 'CLOSED' }, null, group), null);
  const reminder = prepareReminder(tracked, current, null, group);
  const pic = { NAMA: 'PIC <1>', ID_TELEGRAM: '123', SERVICE_AREA: 'PAMEKASAN', LEVEL: ' Korlap ' };
  const [message] = reminderMessages('SURABAYA', [reminder], [pic, pic, { ...pic, ID_TELEGRAM: '456', LEVEL: ' OFFICER   3 ' }, { ...pic, ID_TELEGRAM: '789', LEVEL: 'Officer 2' }], new Date('2026-11-14T03:00:00Z'));
  assert.equal(message.match(/tg:\/\/user\?id=123/g).length, 1);
  assert.match(message, /id=456/);
  assert.doesNotMatch(message, /id=789/);
  assert.match(message, /PIC &lt;1&gt;/);
  assert.match(message, /OLD — CLOSED/);
  assert.match(message, /NEW<\/b> — BACKEND/);
  assert.match(message, /00123/);
  assert.equal((message.match(/Reported Date:/g) || []).length, 2);
});

test('GAUL runs hourly before segment cleanup, and is disabled by default', async () => {
  const date = new Date('2026-11-14T03:00:00Z');
  assert.equal(planReports(date, false).gaulDue, false);
  assert.equal(planReports(new Date(+date + 900000), false, false, true).gaulDue, false);
  const events = [];
  const deps = Object.fromEntries(['segment','ttr','officer','ploting','b2b','hd','gamas','gaul','clearSegment','clearAll']
    .map(name => [name, async () => events.push(name)]));
  await createReportScheduler(deps, createReportQueue({ log() {} }))
    .requestSchedulerJob(planReports(date, false, false, true));
  assert.deepEqual(events.slice(-3), ['gaul', 'clearSegment', 'clearAll']);
});

test('scheduler still checks GAUL from MySQL if segment preparation fails', async () => {
  let checked = 0;
  const scheduler = createReportScheduler({
    segment: async () => { throw new Error('segment failed'); },
    gaul: async () => { checked++; },
  }, createReportQueue({ log() {} }), { error() {} });
  await scheduler.requestSchedulerJob(planReports(new Date('2026-11-14T03:00:00Z'), false, false, true));
  assert.equal(checked, 1);
});

test('GAUL binding replies immediately if MongoDB is disconnected', async () => {
  const { bindGaul } = require('../modules/gaul/gaul.commands');
  const ctx = { chat: { type: 'supergroup', id: -100 }, message: {},
    reply: async message => message };
  const model = { db: { readyState: 0 }, updateOne: () => assert.fail('Unexpected write') };
  assert.match(await bindGaul(ctx, 'SURABAYA', model), /MongoDB bot belum terhubung/);
});

test('GAUL combines areas and orders ticket types and remaining SLA within each area', () => {
  const now = new Date('2026-11-14T07:00:00Z');
  const reminder = (incident, area, type, hour) => ({
    area,
    tracked: { service_no: '00123', previous_incident: 'OLD', previous_reported_date: '2026-08-20 10:00:00' },
    current: { incident, status: 'OPEN', source_ticket: 'CUSTOMER', customer_segment: 'PL-TSEL',
      customer_type: type, service_no: '00123', workzone: 'GBG', reported_date: '2026-11-14 ' + hour + ':00:00' },
  });
  const rows = [reminder('GOLD-NEW', 'GUBENG', 'HVC_GOLD', '13'),
    reminder('REG', 'GUBENG', 'REGULER', '05'),
    reminder('GOLD-OLD', 'GUBENG', 'HVC_GOLD', '07'),
    reminder('DARMO-1', 'DARMO', 'HVC_GOLD', '13')];
  const messages = reminderMessages('SURABAYA', rows, [], now);
  assert.equal(messages.length, 1);
  const [message] = messages;
  assert.match(message, /<b>HVC_GOLD<\/b> \(2 tiket \| SLA 12H\)/);
  assert.ok(message.indexOf('GOLD-OLD') < message.indexOf('GOLD-NEW'));
  assert.ok(message.indexOf('GOLD-NEW') < message.indexOf('<b>REGULER</b>'));
  assert.match(message, /📍 <b>DARMO<\/b>/);
  assert.equal((message.match(/PENGINGAT TIKET GAUL/g) || []).length, 1);
});

test('GAUL splits long reports at complete ticket boundaries with context', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({
    area: 'GUBENG',
    tracked: { service_no: '00123', previous_incident: 'PREV-' + i, previous_reported_date: '2026-08-20 10:00:00' },
    current: { incident: 'ACTIVE-' + i, status: 'OPEN', service_no: '00123',
      workzone: 'GBG', reported_date: '2026-11-14 09:00:00' },
  }));
  const messages = reminderMessages('SURABAYA', rows, [], new Date('2026-11-14T03:00:00Z'));
  assert.ok(messages.length > 1);
  for (const message of messages) {
    assert.ok(message.length <= 3800);
    assert.match(message, /<b>GUBENG<\/b>/);
    assert.match(message, /<b>REGULER<\/b>/);
    for (const [, id] of message.matchAll(/<b>ACTIVE-(\d+)<\/b>/g)) assert.ok(message.includes('PREV-' + id + ' —'));
  }
  assert.equal(messages.join('').match(/<b>ACTIVE-\d+<\/b>/g).length, rows.length);
});
