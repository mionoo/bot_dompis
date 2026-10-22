const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment-timezone');
const { buildGamasMessages, yamlChunks, ttr, TYPES } = require('../modules/gamas/gamas.formatter');
const { SLA_MAPS } = require('../modules/branch/branch.data');
const now = moment('2026-10-22T01:05:00+07:00');
const ticket = { incident:'INC1', jenis_tiket:'GAMAS_DISTRIBUSI', BRANCH:'SURABAYA', witel:'WITEL LAIN', reported_date:new Date('2026-10-21T20:23:00+07:00') };
test('SLA deadline uses maps and status describes remaining or overdue duration', () => {
 assert.equal(ttr(ticket, now), 'Lewat 42 menit | OVER SLA 🔴');
 for (const type of TYPES) {
  const reported = now.clone().subtract(SLA_MAPS[type], 'hours').add(135, 'minutes');
  assert.equal(ttr({...ticket, jenis_tiket:type, reported_date:reported.toDate()}, now), 'Sisa 2 jam 15 menit | SAFE 🟢');
 }
 for (const [minutes, expected] of [[75,'Sisa 1 jam 15 menit | WARNING 🟡'],[45,'Sisa 45 menit | CRITICAL 🟠'],[-89,'Lewat 1 jam 29 menit | OVER SLA 🔴'],[0,'Lewat 0 menit | OVER SLA 🔴']]) {
  assert.equal(ttr({...ticket, reported_date:now.clone().subtract(4,'hours').add(minutes,'minutes').toDate()}, now),expected);
 }
 assert.match(ttr({...ticket, reported_date:null}, now), /tidak tersedia/);
 const detail=buildGamasMessages([ticket],now.toDate())[2];
 assert.match(detail,/Batas SLA\s+: 2026-10-22 00:23:00 WIB \| SLA 4H/);
 assert.match(detail,/Status SLA\s+: Lewat 42 menit \| OVER SLA 🔴/);
 assert.ok(detail.indexOf('Last Work Log Date') < detail.indexOf('Reported Date'));
 assert.ok(detail.indexOf('Reported Date') < detail.indexOf('Batas SLA'));
});
test('separate messages, deduplication, WIB dates and no redundant SLA fields', () => {
 const messages = buildGamasMessages([ticket,ticket,{...ticket,incident:'INC2'}],now.toDate());
 assert.equal(messages.length,4);
 assert.equal(messages[0],'REPORT GAMAS\n22 Oct 2026 | Update : 01.05 WIB\n\nAREA 3 : 2 Gamas');
 assert.equal(messages[1],'SURABAYA: 2 Gamas');
 assert.match(messages[2],/2026-10-21 20:23:00/);
 assert.match(messages[3],/#2 INC2 \| GAMAS - DISTRIBUSI/);
 assert.doesNotMatch(messages[2],/Regional|Witel|TTR \(jam\)|Sisa SLA|SLA \(jam\)/);
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
