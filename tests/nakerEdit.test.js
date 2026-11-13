const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startEditNaker, handleEditNaker } = require('../modules/naker/naker.edit');
function context() {
  return { chat: { type: 'private' }, from: { id: 123 }, message: {}, reply: async text => text };
}
const query = rows => ({ select: () => ({ limit: () => ({ lean: async () => rows }) }) });
test('any bound level can preview and save only its own name', async () => {
  const ctx = context();
  const model = {
    find(filter) {
      assert.deepEqual(filter, { ID_TELEGRAM: '123', NIK: '001' });
      return query([{ _id: 'profile', NAMA: 'Nama lama' }]);
    },
    async updateOne(filter, update) {
      assert.deepEqual(filter, { _id: 'profile', ID_TELEGRAM: '123', NAMA: 'Nama lama' });
      assert.deepEqual(update, { $set: { NAMA: 'Nama baru' } });
      return { matchedCount: 1 };
    },
  };
  await startEditNaker(ctx, ['001'], model);
  ctx.message.text = 'Nama baru';
  assert.match(await handleEditNaker(ctx, model), /Nama lama: Nama lama/);
  ctx.message.text = 'SIMPAN';
  assert.match(await handleEditNaker(ctx, model), /berhasil/);
  assert.equal(ctx.session, null);
});
test('reject group edits and unbound profiles', async () => {
  const ctx = context();
  ctx.chat.type = 'supergroup';
  assert.match(await startEditNaker(ctx, [], { find: () => assert.fail() }), /japri/);
  ctx.chat.type = 'private';
  assert.match(await startEditNaker(ctx, ['999'], { find: () => query([]) }), /tidak ditemukan/);
  assert.equal(ctx.session, undefined);
});
test('cannot save using another Telegram account session', async () => {
  const ctx = context();
  ctx.session = { owner: '999', step: 'EDIT_NAKER_CONFIRM', newName: 'X' };
  ctx.message.text = 'SIMPAN';
  assert.match(await handleEditNaker(ctx, { updateOne: () => assert.fail() }), /tidak valid/);
});
