const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startManualReport } = require('../core/manualReport');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('handler returns before long preparation/report completes, reply comes first', async () => {
  const events = []; let callback, release;
  const pending = new Promise(resolve => { release = resolve; });
  const ctx = { reply: async text => events.push(text) };
  await startManualReport(ctx, { command: '/testtr', message: 'processing',
    prepare: async () => { events.push('prepare'); await pending; },
    run: async received => { assert.equal(received, ctx); events.push('run'); },
  }, { schedule: fn => { callback = fn; }, logger: { log() {}, error() {} } });
  assert.deepEqual(events, ['processing']);
  callback(); await tick(); assert.deepEqual(events, ['processing', 'prepare']);
  release(); await tick(); assert.deepEqual(events, ['processing', 'prepare', 'run']);
});
test('background errors handled without exposing secrets or invoking report after prepare failure', async () => {
  for (const failAt of ['prepare', 'run']) {
    const errors = []; let callback, calls = 0;
    const fail = () => { throw new Error('https://secret-token'); };
    await startManualReport({ reply: async () => {} }, { command: '/tesploting', message: 'processing',
      prepare: failAt === 'prepare' ? fail : async () => {},
      run: () => { calls++; if (failAt === 'run') fail(); },
    }, { schedule: fn => { callback = fn; }, logger: { log() {}, error: text => errors.push(text) } });
    callback(); await tick();
    assert.equal(calls, failAt === 'prepare' ? 0 : 1);
    assert.equal(errors.length, 1); assert.ok(!errors[0].includes('secret-token'));
  }
});
test('failed acknowledgement does not start a background job', async () => {
  await assert.rejects(startManualReport({ reply: async () => { throw new Error('reply failed'); } },
    { message: 'processing' }, { schedule: () => assert.fail('must not schedule') }));
});
