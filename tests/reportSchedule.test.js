const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createReportQueue } = require('../core/reportQueue');
const { planReports, createReportScheduler } = require('../core/reportSchedule');
const logger = { log() {}, error() {} };
test('daytime, nighttime and hour boundaries preserve operational and FFG frequencies', () => {
  for (let hour = 0; hour < 24; hour++) for (const minute of [0, 15, 30, 45]) {
    const date = new Date(Date.UTC(2026, 9, 25, hour - 7, minute));
    const job = planReports(date, true);
    assert.equal(job.operational, (hour >= 8 && hour < 22) || minute === 0);
    assert.equal(job.ffgActive, true); assert.equal(job.ffgHourly, minute === 0);
    assert.equal(job.includeGamas, minute === 0);
    assert.equal(planReports(date, false).ffgActive, false);
  }
});
test('operational work/cleanup precedes both FFG reports; original date is retained', async () => {
  const events = [], queue = createReportQueue(logger);
  let release;
  const block = new Promise(resolve => { release = resolve; });
  const blocker = queue.enqueue('manual', 'manual', () => block);
  const deps = Object.fromEntries(['segment', 'ttr', 'officer', 'ploting', 'b2b', 'hd',
    'gamas', 'clearSegment', 'clearAll'].map(key => [key, async () => events.push(key)]));
  const date = new Date('2026-10-25T16:00:00Z');
  deps.ffg = async (mode, actual) => { assert.equal(actual.toISOString(), date.toISOString()); events.push(mode); };
  const scheduler = createReportScheduler(deps, queue, logger);
  const job = planReports(date, true);
  const first = scheduler.requestSchedulerJob(job);
  assert.equal(first, scheduler.requestSchedulerJob(job));
  assert.deepEqual(events, []); release(); await blocker; await first;
  assert.deepEqual(events, ['segment', 'ttr', 'officer', 'ploting', 'b2b', 'hd',
    'gamas', 'clearSegment', 'clearAll', 'active', 'hourly']);
});
test('night quarter-hour only runs FFG and errors do not prevent later reports/jobs', async () => {
  const events = [], queue = createReportQueue(logger);
  const scheduler = createReportScheduler({ ffg: async mode => {
    events.push(mode); if (mode === 'active') throw new Error('timeout');
  } }, queue, logger);
  await scheduler.requestSchedulerJob(planReports(new Date('2026-10-25T18:15:00Z'), true));
  assert.deepEqual(events, ['active']);
  await scheduler.requestSchedulerJob({ operational: false, ffgActive: true, ffgHourly: true });
  assert.deepEqual(events, ['active', 'active', 'hourly']);
  await assert.rejects(queue.enqueue('failed', 'failed', async () => { throw new Error(); }));
  await queue.enqueue('next', 'next', async () => events.push('next'));
  assert.equal(events.at(-1), 'next');
});
test('manual and scheduled jobs share one queue without overlapping', async () => {
  const queue = createReportQueue(logger), events = [];
  let active = 0;
  const run = label => async () => {
    assert.equal(active++, 0); events.push(label);
    await new Promise(resolve => setImmediate(resolve)); active--;
  };
  await Promise.all([queue.enqueue('cron', 'cron', run('cron')),
    queue.enqueue('manual1', 'manual', run('manual1')),
    queue.enqueue('manual2', 'manual', run('manual2'))]);
  assert.deepEqual(events, ['cron', 'manual1', 'manual2']);
});
