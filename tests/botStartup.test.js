const { test } = require('node:test');
const assert = require('node:assert/strict');
const { launchWithRetry, startBots } = require('../core/botStartup');
const silent = { log() {}, warn() {}, error() {} };
test('network failures recover with increasing capped delays without exposing token', async () => {
  let calls = 0; const delays = [], logs = [];
  const logger = { log: text => logs.push(text), warn: text => logs.push(text), error: text => logs.push(text) };
  await launchWithRetry({ launch: async () => {
    if (++calls <= 6) throw Object.assign(new Error('https://secret-token'), { code: 'ETIMEDOUT' });
  } }, 'Assist1', { sleep: async ms => delays.push(ms), logger });
  assert.deepEqual(delays, [5000, 10000, 20000, 40000, 60000, 60000]);
  assert.equal(calls, 7); assert.ok(!logs.join('').includes('secret-token'));
});
test('401 and 409 stop without retry', async () => {
  for (const code of [401, 409]) {
    let calls = 0;
    await launchWithRetry({ launch: async () => { calls++; throw { response: { error_code: code } }; } },
      'Assist2', { sleep: async () => assert.fail('must not retry'), logger: silent });
    assert.equal(calls, 1);
  }
});
test('Telegram 429 respects retry_after', async () => {
  let calls = 0; const delays = [];
  await launchWithRetry({ launch: async () => {
    if (++calls === 1) throw { code: 429, parameters: { retry_after: 90 } };
  } }, 'Assist3', { sleep: async ms => delays.push(ms), logger: silent });
  assert.deepEqual(delays, [90000]);
});
test('a bot waiting for network retry does not block other bot startup', async () => {
  let release; const launched = [];
  const sleep = ms => ms === 5000 ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
  let tries = 0;
  const tasks = startBots([
    { label: 'Assist1', bot: { launch: async () => { if (++tries === 1) throw { code: 'ETIMEDOUT' }; launched.push('Assist1'); } } },
    { label: 'Assist2', bot: { launch: async () => { launched.push('Assist2'); } } },
  ], { sleep, logger: silent });
  await tasks[1]; assert.deepEqual(launched, ['Assist2']);
  release(); await tasks[0]; assert.equal(tries, 2);
});
