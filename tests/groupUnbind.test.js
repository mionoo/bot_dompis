const test = require('node:test');
const assert = require('node:assert/strict');
const { unbindGroup } = require('../modules/group/group.unbind');
function fixture(text='/hapusgrup', topic=123, status='administrator') {
 const calls=[], replies=[];
 const ctx={chat:{id:-1001,type:'supergroup'},from:{id:42},message:{text,message_thread_id:topic},telegram:{getChatMember:async()=>({status})},reply:async text=>replies.push(text)};
 const models={Idgrups:{deleteMany:async q=>{calls.push(['normal',q]);return {deletedCount:1};}},idgrupKawal:{deleteMany:async q=>{calls.push(['kawal',q]);return {deletedCount:1};}}};
 return {ctx,calls,replies,deps:{models,sessions:{getActiveGroupSetup:()=>null}}};
}
test('bare command with mention deletes both collections only in current topic',async()=>{
 const f=fixture('/hapusgrup@ExampleBot');await unbindGroup(f.ctx,f.deps);
 const query={ID_GRUP:'-1001',ID_TOPIC_GRUP:'123',TIPE_GRUP:{$in:['ORDER','REPORT','KAWAL']}};
 assert.deepEqual(f.calls,[['normal',query],['kawal',query]]);
 assert.match(f.replies[0],/dihapus \(2 data\)/);
});
test('ordinary group and forum main only match bindings without a topic',async()=>{
 for(const type of ['group','supergroup']) {
  const f=fixture('/hapusgrup',null);f.ctx.chat.type=type;await unbindGroup(f.ctx,f.deps);
  assert.equal(f.calls.length,2);
  for(const [,q] of f.calls) assert.deepEqual(q.ID_TOPIC_GRUP,{$in:[null,'','0']});
 }
});
test('arguments, nonadmin and private chat cannot delete',async()=>{
 for(const text of ['/hapusgrup ORDER','/hapusgrup ALL','/hapusgrup REPORT 123']) {
  const f=fixture(text);await unbindGroup(f.ctx,f.deps);assert.equal(f.calls.length,0);
 }
 const f=fixture('/hapusgrup',123,'member');await unbindGroup(f.ctx,f.deps);assert.equal(f.calls.length,0);
 const g=fixture();g.ctx.chat.type='private';await unbindGroup(g.ctx,g.deps);assert.equal(g.calls.length,0);
});
test('missing binding is reported and pending setup is cancelled',async()=>{
 const f=fixture();for(const model of Object.values(f.deps.models)) model.deleteMany=async()=>({deletedCount:0});
 const setup={};let finished;
 f.deps.sessions={getActiveGroupSetup:()=>setup,finishGroupSetup:s=>{finished=s;}};
 await unbindGroup(f.ctx,f.deps);assert.match(f.replies[0],/tidak ditemukan/);assert.equal(finished,setup);
});
