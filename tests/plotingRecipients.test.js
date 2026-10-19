const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getPicMappingByHSA, PLOTTING_LEVEL } = require('../modules/ploting/ploting.recipients');

test('plotting accepts role capitalization and surrounding/internal separator whitespace', () => {
  for (const role of ['KORLAP', 'Korlap', ' korlap ', '\tKoRlAp\t',
    'HSA', ' hsa ', 'OSA', ' osa ', 'Officer 3', 'OFFICER 3', ' officer   3 ', 'officer\t3']) {
    assert.ok(PLOTTING_LEVEL.test(role), role);
  }
  for (const role of ['TEKNISI', 'Officer 2', 'Officer 30', 'KORLAP LAIN',
    'ASISTEN HSA', '', 'OFFICER3']) assert.equal(PLOTTING_LEVEL.test(role), false, role);
});

test('actual Mongo filter includes uppercase KORLAP and builds KEBUMEN recipients without writes', async () => {
  const users = [
    { LEVEL: 'KORLAP', NIK: '16921115', SERVICE_AREA: 'KEBUMEN', BRANCH: 'MAGELANG', ID_TELEGRAM: '68619032' },
    { LEVEL: ' officer   3 ', SERVICE_AREA: ' kebumen ', BRANCH: ' magelang ', ID_TELEGRAM: ' 123 ' },
    { LEVEL: 'TEKNISI', SERVICE_AREA: 'KEBUMEN', BRANCH: 'MAGELANG', ID_TELEGRAM: '999' },
    { LEVEL: 'HSA', SERVICE_AREA: ' ', BRANCH: 'MAGELANG', ID_TELEGRAM: '999' },
  ];
  const before = JSON.stringify(users);
  const model = { find: filter => {
    assert.deepEqual(filter.ID_TELEGRAM, { $exists: true, $nin: ['', null] });
    return { lean: async () => users.filter(user => filter.LEVEL.$regex.test(user.LEVEL)) };
  } };
  const mapping = await getPicMappingByHSA(model);
  assert.deepEqual(mapping, { KEBUMEN: [
    { chatId: '68619032', topic: undefined, branch: 'MAGELANG' },
    { chatId: '123', topic: undefined, branch: 'MAGELANG' },
  ] });
  assert.equal(JSON.stringify(users), before);
});
