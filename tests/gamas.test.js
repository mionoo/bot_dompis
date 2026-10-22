const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment-timezone');
const { buildGamasMessages, yamlChunks, ttr, TYPES } = require('../modules/gamas/gamas.formatter');
const now = moment('2026-10-22T01:05:00+07:00');
const ticket = { incident:'INC1', jenis_tiket:'GAMAS_DISTRIBUSI', BRANCH:'SURABAYA', witel:'WITEL LAIN', reported_date:new Date('2026-10-21T20:23:00+07:00') };
test('TTR is elapsed decimal hours at report time for every GAMAS type', () => {
 const at = moment('2026-10-22T16:20:06+07:00');
 const reported = new Date('2026-10-22T01:35:06+07:00');
 for (const type of TYPES) {
  assert.equal(ttr({...ticket, jenis_tiket:type, reported_date:reported}, at), '14.75');
 }
 assert.equal(ttr({...ticket, reported_date:at.toDate()}, at), '0.00');
 assert.equal(ttr({...ticket, reported_date:at.clone().subtract(100,'hours').subtract(1,'minute').toDate()},at),'100.02');
 for (const invalid of [null, 'invalid', at.clone().add(1,'hour').toDate()]) {
  assert.equal(ttr({...ticket, reported_date:invalid},at),'-');
 }
 const detail=buildGamasMessages([{...ticket,reported_date:reported}],at.toDate())[2];
 assert.match(detail,/Reported Date\s+: 2026-10-22 01:35:06 WIB\nTTR \(jam\)\s+: 14.75$/);
 assert.doesNotMatch(detail,/Batas SLA|Status SLA|OVER SLA|SAFE/);
});
test('separate messages, deduplication, WIB dates and no redundant SLA fields', () => {
 const messages = buildGamasMessages([ticket,ticket,{...ticket,incident:'INC2'}],now.toDate());
 assert.equal(messages.length,4);
 assert.equal(messages[0],'REPORT GAMAS\n22 Oct 2026 | Update : 01.05 WIB\n\nAREA 3 : 2 Gamas');
 assert.equal(messages[1],'SURABAYA: 2 Gamas');
 assert.match(messages[2],/2026-10-21 20:23:00/);
 assert.match(messages[3],/#2 INC2 \| GAMAS - DISTRIBUSI/);
 assert.doesNotMatch(messages[2],/Regional|Witel|Batas SLA|Status SLA|Sisa SLA|SLA \(jam\)/);
 assert.match(buildGamasMessages([],now.toDate())[0],/0 Gamas/);
});
test('plain code blocks split oversized lines without losing emoji', () => {
 const raw = '<>&🔴'.repeat(1800);
 const chunks=yamlChunks(raw);
 assert.ok(chunks.length>1);
 assert.ok(chunks.every(c => c.startsWith("<pre>") && !c.includes("language-yaml")));
 const decoded=chunks.map(c=>c.replace(/^<pre>/,'').replace(/<\/pre>$/,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')).join('');
 assert.equal(decoded,raw);
});
test('GAMAS fields persist with both segment model entrypoints', () => {
 const {SegmentTickets}=require('../models/dompis');
 assert.equal(require('../modules/segmentasiTiket/segmentasi.segmentasiTiket'),SegmentTickets);
 const doc=new SegmentTickets({region:'REG-4',perangkat:'ODC-X',last_update_worklog:'2026-10-22 00:53:00'});
 assert.equal(doc.toObject().perangkat,'ODC-X');
 assert.equal(doc.toObject().last_update_worklog,'2026-10-22 00:53:00');
});

test('BRANCH uses segment mapping, normalizes prefixes/case and never falls back to Witel', () => {
 const messages = buildGamasMessages([
  {...ticket, incident:'A', BRANCH:'BRANCH denpasar', witel:'SURABAYA'},
  {...ticket, incident:'B', BRANCH:'DENPASAR'},
  {...ticket, incident:'C', BRANCH:'AREA DENPASAR'},
  {...ticket, incident:'D', BRANCH:null, witel:'SURABAYA'},
 ], now.toDate());
 assert.ok(messages.includes('DENPASAR: 3 Gamas'));
 assert.ok(messages.includes('-: 1 Gamas'));
 assert.ok(!messages.some(m => m.includes('SURABAYA')));
 for (const msg of messages.filter(m => /^#\d+ [ABC] /.test(m))) {
  assert.match(msg, /BRANCH\s+: DENPASAR/);
 }
});
