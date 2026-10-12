const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { active, sourceDate, sla, dayRange, validateResults, snapshot, STOP } =
  require('../modules/ffg/ffg.logic');
const { buildExcel } = require('../modules/ffg/ffg.excel');
const { Tickets, State } = require('../modules/ffg/ffg.models');
const { FfgWorker } = require('../modules/ffg/ffg.worker');
const { runFfg } = require('../modules/ffg/ffg.service');
const { Deliveries } = require('../modules/ffg/ffg.models');
const { Groups } = require('../models/group');
const { FfgGroups } = require('../modules/ffg/ffg.models');
const { bindFfgGroup } = require('../modules/ffg/ffg.binding');
const { createSource } = require('../modules/ffg/ffg.source');
const { activeMessages, remainingTime } = require('../modules/ffg/ffg.formatter');
test('Mongoose pipeline update is explicitly enabled without opening a database', () => {
  assert.throws(() => Tickets.updateMany({}, [{ $set: { status_validasi: 'OPEN' } }]), /updatePipeline/);
  const query = Tickets.updateMany({}, [{ $set: { status_validasi: 'OPEN' } }], { updatePipeline: true });
  assert.equal(query._mongooseOptions.updatePipeline, true);
});

test('MySQL locks accept numeric and string 1 but reject unavailable or lost locks', async () => {
  const names = ['HOST', 'USER', 'PASSWORD', 'DATABASE'].map(k => `FFG_MYSQL_${k}`);
  const saved = names.map(k => process.env[k]);
  names.forEach(k => { process.env[k] = 'fixture'; });
  try {
    for (const value of [1, '1', 0, '0', null]) {
      let owned = value, executed = 0;
      const connection = {
        query: async sql => [[sql.includes('GET_LOCK') ? { acquired: value } : { owned }]],
        execute: async () => { executed++; return [[{ incident: 'INC1' }]]; }, destroy: () => {},
      };
      const source = createSource({ createPool: () => ({
        getConnection: async () => connection, end: async () => {},
      }) });
      try {
        if (Number(value) === 1) {
          await source.lock();
          assert.deepEqual(await source.byIncidents(['INC1']), [{ incident: 'INC1' }]);
          owned = '0';
          await assert.rejects(source.byIncidents(['INC1']), /lock lost/);
          assert.equal(executed, 1);
        } else {
          await assert.rejects(source.lock(), /Another FFG worker/);
          assert.equal(executed, 0);
        }
      } finally { await source.close(); }
    }
  } finally {
    names.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
});
const row = { id: '8', incident: 'INC1', service_no: '03135967129',
  status: 'ANALYSIS', status_validasi: 'OPEN', reported_date: '2026-10-12 08:00:00',
  status_date: '2026-10-12 10:00:00', updated_at: '2026-10-12 10:01:00',
  customer_segment: 'DES', service_type: 'ASTINET', customer_name: '=1+1' };

test('TTR HD-style FFG groups HSA/segment and sorts urgent tickets first', () => {
  const now = new Date('2026-10-12T04:00:00Z');
  const tickets = [
    { ...snapshot(row), incident: 'SAFE', HSA: 'PAMEKASAN', reported_at: new Date('2026-10-12T03:00:00Z') },
    { ...snapshot(row), incident: 'OVER', HSA: 'PAMEKASAN', reported_at: new Date('2026-10-12T00:00:00Z'),
      ticket: { booking_date: '2026-10-13 09:00:00' } },
    { ...snapshot(row), incident: 'OTHER', HSA: 'DARMO' },
  ];
  const text = activeMessages('SURABAYA', tickets, now).join('\n');
  assert.ok(text.includes('📍 HSA: PAMEKASAN\nTotal Tiket : 2'));
  assert.ok(text.includes('DATIN (2 tiket | SLA 3H | 🔴 1 OVER SLA)'));
  assert.ok(text.indexOf('🔴 OVER |') < text.indexOf('🟢 SAFE |'));
  assert.ok(text.includes('Sisa: -1:00'));
  assert.ok(text.includes('13/10/2026 09:00:00'));
  assert.ok(text.indexOf('HSA: DARMO') < text.indexOf('HSA: PAMEKASAN'));
});
test('long FFG messages retain HSA context, stay within size limit and include each incident once', () => {
  const tickets = Array.from({ length: 350 }, (_, i) => ({ ...snapshot(row),
    incident: `INC_TEST_${String(i).padStart(4, '0')}`, HSA: 'PAMEKASAN', workzone: 'PME' }));
  const chunks = activeMessages('SURABAYA', tickets, new Date('2026-10-12T04:00:00Z'));
  assert.ok(chunks.length > 1);
  for (const text of chunks) {
    assert.ok(text.length <= 3800);
    assert.ok(text.includes('📍 HSA: PAMEKASAN') && text.includes('📌 DATIN'));
  }
  const ids = chunks.join('\n').match(/INC_TEST_\d{4}/g);
  assert.equal(ids.length, 350); assert.equal(new Set(ids).size, 350);
});
test('SQM labels only PROACTIVE tickets directly after incident', () => {
  const tickets = [
    { ...snapshot(row), incident: 'INC_SQM', source_ticket: ' proactive ' },
    { ...snapshot(row), incident: 'INC_CUSTOMER', source_ticket: 'CUSTOMER' },
    { ...snapshot(row), incident: 'INC_RAW_SQM', ticket: { source_ticket: 'PROACTIVE' } },
  ];
  const text = activeMessages('SURABAYA', tickets, new Date('2026-10-12T04:00:00Z')).join('\n');
  assert.ok(text.includes('INC_SQM | SQM | Sisa:'));
  assert.ok(text.includes('INC_RAW_SQM | SQM | Sisa:'));
  assert.ok(text.includes('INC_CUSTOMER | Sisa:'));
  assert.ok(!text.includes('INC_CUSTOMER | SQM'));
});

test('remaining time and missing SLA data remain explicit', () => {
  assert.equal(remainingTime(0.75), '0:45');
  assert.equal(remainingTime(-1.5), '-1:30');
  const text = activeMessages('SURABAYA', [{ ...snapshot(row), reported_at: null }], new Date()).join('');
  assert.ok(text.includes('HSA BELUM DIPETAKAN'));
  assert.ok(text.includes('WAKTU SLA BELUM TERSEDIA'));
  assert.ok(!text.includes('NaN'));
});

test('four stopping statuses and unknown statuses excluded, live states included', () => {
  for (const status of STOP) assert.equal(active({ status: ` ${status.toLowerCase()} ` }), false);
  for (const status of ['OPEN', 'ANALYSIS', 'BACKEND', 'DRAFT', 'PENDING', 'FINALCHECK'])
    assert.equal(active({ status }), true);
  for (const status of ['', null, 'UNKNOWN', 'STATUS']) assert.equal(active({ status }), false);
});
test('WIB source wall clock converted once to UTC, invalid dates rejected', () => {
  assert.equal(sourceDate(row.reported_date).toISOString(), '2026-10-12T01:00:00.000Z');
  assert.equal(sourceDate('2026-02-30 12:00:00'), null);
});
test('midnight day range uses WIB, independent of host timezone', () => {
  const range = dayRange(new Date('2026-10-11T17:00:00Z'));
  assert.equal(range.start.toISOString(), '2026-10-11T17:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-10-12T17:00:00.000Z');
});
test('DATIN SLA uses existing 3h target and thresholds', () => {
  const ticket = snapshot(row);
  assert.equal(sla(ticket, new Date('2026-10-12T01:30:00Z')).label, 'SAFE');
  assert.equal(sla(ticket, new Date('2026-10-12T02:30:00Z')).label, 'WARNING');
  assert.equal(sla(ticket, new Date('2026-10-12T03:00:00Z')).label, 'CRITICAL');
  assert.equal(sla(ticket, new Date('2026-10-12T04:00:00Z')).label, 'OVER SLA');
});
test('all stopping states freeze elapsed time; reopen resumes current elapsed', () => {
  for (const status of STOP) {
    const ticket = snapshot({ ...row, status });
    assert.equal(sla(ticket, new Date('2026-10-13T00:00:00Z')).elapsed, 2);
  }
  const reopened = snapshot({ ...row, status: 'ANALYSIS' });
  assert.equal(reopened.stopped_at, null);
  assert.equal(sla(reopened, new Date('2026-10-12T04:00:00Z')).elapsed, 3);
});
test('missing stop date is explicit, never continues stopped SLA', () => {
  const ticket = snapshot({ ...row, status: 'CLOSED', status_date: null });
  assert.equal(sla(ticket).label, 'WAKTU SLA BELUM TERSEDIA');
});
test('service numbers never coerced from numeric data', () => {
  assert.throws(() => snapshot({ ...row, service_no: 3135967129 }));
  assert.equal(snapshot(row).service_no, '03135967129');
});
test('API must return complete unique results; NOT MATCH is valid', () => {
  const result = { service_no: row.service_no, match: false };
  assert.equal(validateResults({ success: true, results: [result] }, [row.service_no]).get(row.service_no).match, false);
  for (const results of [[], [result, result], [{ ...result, match: 'false' }],
    [{ ...result, service_no: 'other' }]])
    assert.throws(() => validateResults({ success: true, results }, [row.service_no]));
});
test('Excel roundtrip preserves full fields, literal formula-like text and leading zero', async () => {
  const ticket = { ...snapshot({ ...row, status: 'RESOLVED', extra_detail: 'complete' }),
    ffg: { source_sheet: 'HSI', service_type: 'POTS' }, matched_at: new Date() };
  const bytes = await buildExcel([ticket]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('Tiket FFG');
  const headers = sheet.getRow(1).values;
  const cell = key => sheet.getRow(2).getCell(headers.indexOf(key));
  assert.equal(cell('service_no').value, '03135967129');
  assert.equal(cell('customer_name').value, '=1+1');
  assert.equal(cell('extra_detail').value, 'complete');
  assert.equal(cell('SLA_ELAPSED_HOURS').value, 2);
  assert.equal(sheet.views[0].ySplit, 1);
});

test('sync captures final CLOSE once and excludes it from subsequent source reads', async () => {
  const saved = { find: Tickets.find, update: Tickets.updateOne,
    many: Tickets.updateMany, state: State.updateOne };
  const docs = [{ incident: 'INC1', status_validasi: 'OPEN' },
    { incident: 'INC2', status_validasi: 'CLOSE' }];
  const calls = [];
  Tickets.find = filter => {
    assert.deepEqual(filter, { status_validasi: 'OPEN' });
    return { select: () => ({ lean: () => ({ cursor: async function* () {
      for (const doc of docs) if (doc.status_validasi === 'OPEN') yield doc;
    } }) }) };
  };
  Tickets.updateMany = async (filter, update, options) => {
    if (Array.isArray(update)) assert.equal(options?.updatePipeline, true);
  };
  Tickets.updateOne = async (filter, update) => {
    assert.equal(filter.status_validasi, 'OPEN');
    Object.assign(docs.find(d => d.incident === filter.incident), update.$set);
  };
  State.updateOne = async () => {};
  const worker = new FfgWorker({ byIncidents: async incidents => {
    calls.push(incidents);
    return [{ ...row, status_validasi: 'CLOSE', status: 'RESOLVED' }];
  } });
  try {
    await worker.sync();
    assert.equal(docs[0].status_validasi, 'CLOSE');
    assert.equal(docs[0].status, 'RESOLVED');
    await worker.sync();
    assert.deepEqual(calls, [['INC1']]);
  } finally {
    Tickets.find = saved.find; Tickets.updateOne = saved.update;
    Tickets.updateMany = saved.many; State.updateOne = saved.state;
  }
});

test('report selection, attachment schedule and period dedup without Telegram', async t => {
  const now = new Date('2026-10-12T04:00:00Z');
  const saved = { state: State.findById, tickets: Tickets.find, groups: Groups.find,
    ids: FfgGroups.find, create: Deliveries.create, update: Deliveries.updateOne };
  const docs = [
    { ...snapshot(row, now), incident: 'OPEN1', workzone: 'STO1' },
    { ...snapshot({ ...row, status: 'CLOSED', status_validasi: 'CLOSE' }, now),
      incident: 'CLOSED1', workzone: 'STO1', synced_at: new Date(+now - 3600000) },
    { ...snapshot(row, now), incident: 'STALE1', workzone: 'STO1', synced_at: new Date(0) },
    { ...snapshot(row, now), incident: 'OTHER_BRANCH', workzone: 'STO2' },
  ];
  let texts = [], files = [], states = [], fresh = true, fail = false;
  const keys = new Set();
  State.findById = () => ({ lean: async () => ({ completed_at: fresh ? now : new Date(0) }) });
  Tickets.find = query => ({ sort: () => ({ lean: async () => {
    if (query.reported_at) assert.equal(query.reported_at.$gte.toISOString(), '2026-10-11T17:00:00.000Z');
    return docs;
  } }) });
  Groups.find = () => ({ lean: async () => [
    { WORKZONE: 'STO1', SERVICE_AREA: 'SA1', BRANCH: 'BRANCH SURABAYA', ZONEBOT: 'Assist1' },
    { WORKZONE: 'STO2', SERVICE_AREA: 'SA2', BRANCH: 'MALANG', ZONEBOT: 'Assist1' },
  ] });
  FfgGroups.find = () => ({ lean: async () => [{ ID_GRUP: 'TEST', BRANCH: 'SURABAYA', ID_TOPIC_GRUP: '2' }] });
  Deliveries.create = async doc => {
    if (keys.has(doc._id)) { const error = new Error('duplicate'); error.code = 11000; throw error; }
    keys.add(doc._id);
  };
  Deliveries.updateOne = async (filter, update) => { states.push(update.$set.status); };
  const runtime = { getBotByZone: async () => ({ telegram: {
    sendMessage: async (chat, text, options) => {
      assert.equal(options.message_thread_id, 2);
      if (fail) throw new Error('lost response');
      texts.push(text);
    },
    sendDocument: async (chat, file) => { files.push(file); },
  } }) };
  try {
    await t.test('15-minute report includes only fresh active tickets and no Excel', async () => {
      await runFfg('active', now, runtime);
      assert.ok(texts[0].includes('OPEN1'));
      assert.ok(!texts[0].includes('CLOSED1') && !texts[0].includes('STALE1'));
      assert.ok(!texts[0].includes('OTHER_BRANCH'));
      assert.equal(files.length, 0);
    });
    await t.test('same destination/slot is not sent twice', async () => {
      await runFfg('active', now, runtime);
      assert.equal(texts.length, 1);
    });
    await t.test('hourly has open and stopped tickets, with valid XLSX', async () => {
      await runFfg('hourly', now, runtime);
      assert.ok(texts[1].includes('OPEN1') && texts[1].includes('CLOSED1'));
      assert.equal(files.length, 1);
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(files[0].source);
      assert.equal(workbook.getWorksheet('Tiket FFG').rowCount, 3);
    });
    await t.test('stale global source prevents sending', async () => {
      fresh = false; await runFfg('active', new Date(+now + 900000), runtime);
      assert.equal(texts.length, 2); fresh = true;
    });
    await t.test('uncertain delivery is recorded and not retried in same slot', async () => {
      const next = new Date(+now + 60000); // keep fixtures fresh
      keys.clear(); fail = true;
      await runFfg('active', next, runtime);
      assert.equal(states.at(-1), 'UNKNOWN');
      fail = false; await runFfg('active', next, runtime);
      assert.equal(texts.length, 2);
    });
  } finally {
    State.findById = saved.state; Tickets.find = saved.tickets;
    Groups.find = saved.groups; FfgGroups.find = saved.ids;
    Deliveries.create = saved.create; Deliveries.updateOne = saved.update;
  }
});

test('FFG binding stores branch/group/topic and handles invalid or duplicate commands', async t => {
  let records = [], replies = [], existing = null;
  const model = { findOne: () => ({ lean: async () => existing }),
    create: async data => { records.push(data); } };
  const context = (text, type = 'supergroup', topic = 7) => ({
    chat: { id: -100123, type, title: 'Grup uji' },
    message: { text, message_thread_id: topic }, reply: async text => { replies.push(text); },
  });
  await t.test('valid command with bot mention saves active binding', async () => {
    await bindFfgGroup(context('/ffg_SURABAYA@TestBot'), model);
    assert.deepEqual(records[0], { BRANCH: 'SURABAYA', ID_GRUP: '-100123',
      ID_TOPIC_GRUP: '7', NAMA_GRUP: 'Grup uji', STATUS: 'ACTIVE' });
    assert.ok(replies.at(-1).includes('berhasil disimpan'));
  });
  await t.test('private chat cannot bind a destination', async () => {
    await bindFfgGroup(context('/ffg_SURABAYA', 'private'), model);
    assert.equal(records.length, 1);
  });
  await t.test('empty and unknown branches are rejected', async () => {
    await bindFfgGroup(context('/ffg_'), model);
    await bindFfgGroup(context('/ffg_INVALID_BRANCH'), model);
    assert.equal(records.length, 1);
  });
  await t.test('duplicate binding does not insert again', async () => {
    existing = records[0]; await bindFfgGroup(context('/ffg_SURABAYA'), model);
    assert.equal(records.length, 1); existing = null;
  });
  await t.test('non-forum group has null topic', async () => {
    await bindFfgGroup(context('/ffg_SURABAYA', 'group', undefined), model);
    // Explicit null represents no topic (the helper default argument is 7).
    await bindFfgGroup(context('/ffg_SURABAYA', 'group', null), model);
    assert.equal(records.at(-1).ID_TOPIC_GRUP, null);
  });
});
