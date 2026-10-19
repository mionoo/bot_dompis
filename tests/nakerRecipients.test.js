const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Nakers } = require('../models/users');
const { findOfficer, getPicMappingByHSA } = require('../modules/naker/naker.service');

test('TTR Officer accepts role case/spacing without including other levels', async () => {
  const original = Nakers.find;
  try {
    Nakers.find = async query => {
      const regex = query.LEVEL.$regex;
      for (const role of ['Manager', 'MANAGER', ' manager ', 'Officer 1',
        ' officer   1 ', 'OFFICER 2', 'officer\t2']) assert.ok(regex.test(role), role);
      for (const role of ['KORLAP', 'HSA', 'OSA', 'TEKNISI', 'Officer 3',
        'Officer 12', 'ASISTEN MANAGER', '']) assert.equal(regex.test(role), false, role);
      assert.deepEqual(query.ID_TELEGRAM, { $exists: true, $nin: ['', null] });
      return [{ LEVEL: 'OFFICER 2', ID_TELEGRAM: '123' }];
    };
    assert.equal((await findOfficer())[0].LEVEL, 'OFFICER 2');
  } finally { Nakers.find = original; }
});

test('naker PIC role filter tolerates variations while retaining its original role set', async () => {
  const original = Nakers.find;
  const user = { LEVEL: ' KORLAP ', SERVICE_AREA: ' kebumen ', BRANCH: ' magelang ', ID_TELEGRAM: '123' };
  const before = JSON.stringify(user);
  try {
    Nakers.find = async query => {
      const regex = query.LEVEL.$regex;
      for (const role of ['HSA', ' hsa ', 'Korlap', ' KORLAP ', 'Officer 3', ' officer   3 '])
        assert.ok(regex.test(role), role);
      for (const role of ['OSA', 'MANAGER', 'OFFICER 2', 'TEKNISI', 'KORLAP LAIN'])
        assert.equal(regex.test(role), false, role);
      return [user];
    };
    const mapping = await getPicMappingByHSA();
    assert.equal(mapping.KEBUMEN[0].chatId, '123');
    assert.equal(mapping.KEBUMEN[0].branch, 'MAGELANG');
    assert.equal(JSON.stringify(user), before);
  } finally { Nakers.find = original; }
});
