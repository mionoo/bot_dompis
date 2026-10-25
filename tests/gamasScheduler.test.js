const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
test('GAMAS runs on hourly slots only, before cleanup, with shared queue', async () => {
 const schedules = [], events = [];
 const queue = require('../core/reportQueue').createReportQueue({log(){}});
 let block, release;
 const mocks = {
  './core/reportQueue': {reportQueue: queue},
  './core/reportSchedule': require('../core/reportSchedule'),
  'node-cron': {schedule: (...args) => schedules.push(args)},
  './modules/gamas/gamas.service': {runGamas: async () => events.push('gamas')},
  './modules/segmentasiTiket/segmentasi.start': {jalanSegmentasi: async () => { if(block) await block; events.push('segment'); }},
  './modules/segmentasiTiket/segmentasi.clear': {clearSegmentTickets: async () => events.push('clear'), clearAllTickets: async () => {}},
 };
 const sandbox = {process:{env:{FFG_ENABLED:'0'}}, module:{exports:{}}, console:{log(){},warn(){},error(e){throw e;}}, Date,
  require: name => mocks[name] || new Proxy({}, {get: () => async () => {}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../test.js'),'utf8'),sandbox);
 const tick = () => new Promise(resolve => setImmediate(resolve));
 for (const minute of [0,15,30,45]) {
  events.length=0;
  schedules[0][1]({date:new Date(`2026-10-22T01:${String(minute).padStart(2,'0')}:00Z`)});
  await queue.idle();
  assert.equal(events.includes('gamas'),minute===0);
  if(minute===0) assert.ok(events.indexOf('gamas') < events.indexOf('clear'));
 }
 events.length=0;
 assert.equal(schedules.length,1);
 schedules[0][1]({date:new Date('2026-10-22T15:00:00Z')}); await queue.idle();
 assert.ok(events.includes('gamas'));
 events.length=0;
 block = new Promise(resolve => {release=resolve;});
 schedules[0][1]({date:new Date('2026-10-22T01:45:00Z')});
 schedules[0][1]({date:new Date('2026-10-22T02:00:00Z')});
 schedules[0][1]({date:new Date('2026-10-22T02:15:00Z')});
 release(); await queue.idle();
 assert.equal(events.filter(e=>e==='gamas').length,1);
 assert.equal(events.filter(e=>e==='segment').length,3);
});
