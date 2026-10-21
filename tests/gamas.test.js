const test = require('node:test');
const assert = require('node:assert/strict');
const moment = require('moment-timezone');
const { buildGamasMessages, yamlChunks, ttr, TYPES } = require('../modules/gamas/gamas.formatter');
const { SLA_MAPS } = require('../modules/branch/branch.data');
const now = moment('2026-10-22T01:05:00+07:00');
const ticket = { incident:'INC1', jenis_tiket:'GAMAS_DISTRIBUSI', witel:'SURABAYA', reported_date:new Date('2026-10-21T20:23:00+07:00') };
test('SLA matches maps and requested negative minute format', () => {
 assert.equal(ttr(ticket, now), 'Sisa: -0:42 | SLA 4H | 🔴 1 OVER SLA');
 for (const type of TYPES) assert.ok(ttr({...ticket, jenis_tiket:type}, now).includes(`SLA ${SLA_MAPS[type]}H`));
 assert.match(ttr({...ticket, reported_date:null}, now), /tidak tersedia/);
});
test('separate messages, deduplication, WIB dates and no redundant SLA fields', () => {
 const messages = buildGamasMessages([ticket,ticket,{...ticket,incident:'INC2'}],now.toDate());
 assert.equal(messages.length,5);
 assert.equal(messages[0],'REPORT GAMAS\n22 Oct 2026 | Update : 01.05 WIB\n\nAREA 3 : 2 Gamas');
 assert.equal(messages[1],'GAMAS_DISTRIBUSI');
 assert.equal(messages[2],'SURABAYA: 2 Gamas');
 assert.match(messages[3],/2026-10-21 20:23:00/);
 assert.match(messages[4],/#2 INC2/);
 assert.doesNotMatch(messages[3],/Status SLA|Sisa SLA|SLA \(jam\)/);
 assert.match(buildGamasMessages([],now.toDate())[0],/0 Gamas/);
});
test('escaped YAML blocks split oversized lines without losing emoji', () => {
 const raw = '<>&🔴'.repeat(1800);
 const chunks=yamlChunks(raw);
 assert.ok(chunks.length>1);
 const decoded=chunks.map(c=>c.replace(/^<pre><code class="language-yaml">/,'').replace(/<\/code><\/pre>$/,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')).join('');
 assert.equal(decoded,raw);
});
test('GAMAS fields persist with both segment model entrypoints', () => {
 const {SegmentTickets}=require('../models/dompis');
 assert.equal(require('../modules/segmentasiTiket/segmentasi.segmentasiTiket'),SegmentTickets);
 const doc=new SegmentTickets({region:'REG-4',perangkat:'ODC-X',last_update_worklog:'2026-10-22 00:53:00'});
 assert.equal(doc.toObject().perangkat,'ODC-X');
 assert.equal(doc.toObject().last_update_worklog,'2026-10-22 00:53:00');
});
