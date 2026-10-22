const test = require('node:test');
const assert = require('node:assert/strict');
const { unbindGamasGroup } = require('../modules/gamas/gamas.unbind');
function fixture(text='/hapusgamas', topic=123, role='administrator') {
 const queries=[], replies=[];
 const ctx={chat:{id:-1001,type:'supergroup'},from:{id:42},message:{text,message_thread_id:topic},telegram:{getChatMember:async()=>({status:role})},reply:async t=>replies.push(t)};
 const deps={Groups:{deleteMany:async q=>{queries.push(q);return {deletedCount:1};}}};
 return {ctx,deps,queries,replies};
}
test('admin deletes exact GAMAS chat/topic binding with bot mention',async()=>{
 const f=fixture('/hapusgamas@ExampleBot');await unbindGamasGroup(f.ctx,f.deps);
 assert.deepEqual(f.queries,[{ID_GRUP:'-1001',ID_TOPIC_GRUP:'123'}]);
 assert.match(f.replies[0],/Binding GAMAS dihapus/);
});
test('main chat and ordinary group exclude other topics',async()=>{
 for(const type of ['group','supergroup']) {
  const f=fixture('/hapusgamas',null,'creator');f.ctx.chat.type=type;
  await unbindGamasGroup(f.ctx,f.deps);
  assert.deepEqual(f.queries,[{ID_GRUP:'-1001',ID_TOPIC_GRUP:{$in:[null,'','0']}}]);
 }
});
test('nonadmin, private chat and arguments cannot delete',async()=>{
 for(const change of [f=>{f.ctx.chat.type='private';},f=>{f.ctx.message.text='/hapusgamas 123';},f=>{f.ctx.telegram.getChatMember=async()=>({status:'member'});}]) {
  const f=fixture();change(f);await unbindGamasGroup(f.ctx,f.deps);assert.equal(f.queries.length,0);
 }
});
test('missing binding reports no deletion',async()=>{
 const f=fixture();f.deps.Groups.deleteMany=async()=>({deletedCount:0});
 await unbindGamasGroup(f.ctx,f.deps);assert.match(f.replies[0],/tidak ditemukan/);
});
