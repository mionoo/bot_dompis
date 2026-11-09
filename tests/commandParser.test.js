const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { parseCommand } = require('../core/commandParser');
const username = 'Assist_SuraMadu_bot';
test('all command families accept own bot mention and ignore other bots before routing', () => {
  for (const command of ['setgrup', 'set', 'start', 'register', 'cancel', 'help', 'naker',
    'testtr', 'tesploting', 'cekofficer', 'tesgrupb2b', 'tesgrupHD', 'teskirimevident',
    'monHD_SURABAYA', 'ttrb2b_SURABAYA', 'ffg_SURABAYA', 'wohi_SURABAYA',
    'tesffgremin', 'tesffgalltiket', 'teswohi', 'setgamas', 'hapusgamas', 'hapusgrup', 'tesgamas']) {
    const result = parseCommand(`/${command}@${username}`, 'supergroup', username);
    assert.equal(result.ignore, false, command);
    assert.equal(result.text, command === 'setgrup' ? '/set' : `/${command}`);
    assert.equal(parseCommand(`/${command}@OtherBot`, 'private', username).ignore, true);
    assert.equal(parseCommand(`/${command}`, 'supergroup', username).ignore, true);
    assert.equal(parseCommand(`/${command}`, 'private', username).ignore, false);
  }
});
test('case, whitespace, arguments and ordinary messages are preserved appropriately', () => {
  assert.equal(parseCommand(' /MONHD_SURABAYA@assist_suramadu_BOT ', 'group', username).text, '/monHD_SURABAYA');
  assert.equal(parseCommand('/naker@Assist_SuraMadu_bot  123 @someone', 'group', username).text, '/naker  123 @someone');
  assert.deepEqual(parseCommand(' 16921115 ', 'private', username), { text: ' 16921115 ', isCommand: false, ignore: false });
  assert.equal(parseCommand('/help@invalid-name', 'group', username).ignore, true);
  assert.equal(parseCommand('/help@Unknown', 'group', undefined).ignore, true);
});
function loadDispatcher(events) {
  const model = { findOne: filter => ({ lean: async () => { events.push(['find', filter]); return null; } }),
    create: async doc => { events.push(['create', doc]); return doc; } };
  const mocks = {
    './commandParser': { parseCommand },
    '../modules/branch/branch.data': { branches: [], findBranch: branch => branch === 'SURABAYA' },
    '../models/idgrupTelegram': { Idgrupb2b: model, IdgrupHD: model },
    './botLogic': { handleMessage: async () => ({ reply: 'HELP' }) },
    './groupSetupSession': { startGroupSetup: () => ({ group: {} }), setSetupMessage: () => events.push(['setup']) },
    './privateFlowSession': { beginPrivateFlow: () => {}, isPrivateFlowExpired: () => false },
    'telegraf': { Markup: { inlineKeyboard: () => ({}), button: { callback: () => ({}) } } },
    './manualReport': { startManualReport: async (ctx, spec) => events.push(['manual', spec.command]) },
  };
  const sandbox = { module: { exports: {} }, console: { log() {}, error() {} },
    require: name => mocks[name] || new Proxy({}, { get: () => async () => events.push(['handler', name]) }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../core/dispatcher.js'), 'utf8'), sandbox);
  return sandbox.module.exports.dispatch;
}
test('dispatcher ignores wrong bot without touching session/db and extracts clean branch', async () => {
  const events = [], dispatch = loadDispatcher(events);
  const ctx = { chat: { type: 'supergroup', id: -1, title: 'test' }, botInfo: { username },
    session: {}, from: { id: 1 }, message: { text: '/monHD_SURABAYA@OtherBot', message_thread_id: 2 },
    reply: async text => { events.push(['reply', text]); return { message_id: 1 }; } };
  await dispatch(ctx); assert.equal(events.length, 0);
  ctx.message.text = `/monHD_SURABAYA@${username}`; await dispatch(ctx);
  assert.equal(events.find(event => event[0] === 'create')[1].BRANCH, 'SURABAYA');
  events.length = 0;
  ctx.message.text = `/setgrup@${username}`; await dispatch(ctx);
  assert.ok(events.some(event => event[0] === 'setup'));
});
test('manual commands and help with mentions bypass active private registration flow', async () => {
  const events = [], dispatch = loadDispatcher(events);
  const ctx = { chat: { type: 'private', id: 1 }, botInfo: { username }, session: { step: 'REGISTER_WAIT_NIK' },
    from: { id: 1 }, message: {}, reply: async text => events.push(['reply', text]) };
  for (const command of ['testtr', 'tesploting', 'cekofficer', 'tesgrupb2b', 'tesgrupHD']) {
    ctx.message.text = `/${command}@${username}`; await dispatch(ctx);
    assert.equal(events.at(-1)[0], 'manual');
  }
  ctx.message.text = `/help@${username}`; await dispatch(ctx);
  assert.equal(events.at(-1)[1], 'HELP');
});
