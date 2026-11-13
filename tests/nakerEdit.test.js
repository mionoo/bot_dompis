const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startEditNaker, handleEditNakerButton } = require('../modules/naker/naker.edit');
const allowed = () => [{ id: 'sby', name: 'BRANCH SURABAYA', serviceAreas: [{ id: 'pme', name: 'PAMEKASAN' }] }];
const query = rows => ({ select: () => ({ limit: () => ({ lean: async () => rows }) }) });
function context() {
  return { chat: { type: 'private' }, from: { id: 123 }, message: {},
    reply: async text => text, answerCbQuery: async text => text, editMessageText: async text => text };
}
const click = (ctx, action, model) => {
  ctx.callbackQuery = { data: 'editnaker:' + ctx.session.token + ':' + action };
  return handleEditNakerButton(ctx, model, allowed);
};
test('bound profile previews and saves only branch and selected service area', async () => {
  const ctx = context();
  let writes = 0;
  const model = {
    find(filter) {
      assert.deepEqual(filter, { ID_TELEGRAM: '123', NIK: '001' });
      return query([{ _id: 'profile', NAMA: 'Nama', NIK: '001', LEVEL: 'Officer 3', BRANCH: 'MAGELANG' }]);
    },
    async updateOne(filter, update) {
      writes++;
      assert.deepEqual(filter, { _id: 'profile', ID_TELEGRAM: '123', BRANCH: 'MAGELANG', SERVICE_AREA: null });
      assert.deepEqual(update, { $set: { BRANCH: 'SURABAYA', SERVICE_AREA: 'PAMEKASAN' } });
      return { matchedCount: 1 };
    },
  };
  assert.match(await startEditNaker(ctx, ['001'], model, allowed), /Level: Officer 3/);
  assert.match(await click(ctx, 'branch:outside', model), /tidak tersedia/);
  await click(ctx, 'branch:sby', model);
  assert.match(await click(ctx, 'area:outside', model), /tidak tersedia/);
  assert.match(await click(ctx, 'area:pme', model), /MAGELANG → SURABAYA/);
  assert.equal(writes, 0);
  assert.match(await click(ctx, 'save', model), /berhasil/);
  assert.equal(writes, 1);
  assert.equal(ctx.session, null);
});
test('reject group edits and unbound profiles', async () => {
  const ctx = context();
  ctx.chat.type = 'supergroup';
  assert.match(await startEditNaker(ctx, [], { find: () => assert.fail() }), /japri/);
  ctx.chat.type = 'private';
  assert.match(await startEditNaker(ctx, ['999'], { find: () => query([]) }), /tidak ditemukan/);
});
test('stale buttons, expired sessions and other users cannot save; cancellation does not write', async () => {
  const ctx = context();
  const model = { find: () => query([{ _id: 'profile' }]), updateOne: () => assert.fail() };
  await startEditNaker(ctx, [], model, allowed);
  ctx.callbackQuery = { data: 'editnaker:stale:save' };
  assert.match(await handleEditNakerButton(ctx, model, allowed), /tidak berlaku/);
  ctx.from.id = 456;
  assert.match(await click(ctx, 'save', model), /tidak berlaku/);
  ctx.from.id = 123;
  ctx.session.expiresAt = Date.now() - 1;
  assert.match(await click(ctx, 'save', model), /tidak berlaku/);
  await startEditNaker(ctx, [], model, allowed);
  assert.match(await click(ctx, 'cancel', model), /dibatalkan/);
  assert.equal(ctx.session, null);
});
