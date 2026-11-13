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
  const [message] = reminderMessages('SURABAYA', [reminder], [pic, pic, { ...pic, ID_TELEGRAM: '456', LEVEL: 'Officer 3' }], new Date('2026-11-14T03:00:00Z'));
  assert.equal(message.match(/tg:\/\/user\?id=123/g).length, 1);
  assert.doesNotMatch(message, /id=456/);
  assert.match(message, /PIC &lt;1&gt;/);
  assert.match(message, /OLD — CLOSED/);
  assert.match(message, /NEW — BACKEND/);
  assert.match(message, /00123/);
  assert.match(message, /SLA:/);
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
