// segmentasi.process.Ticket.js

const moment = require("moment-timezone");

const AllTickets = require("./segmentasi.allTiket");

const SegmentTickets = require("./segmentasi.segmentasiTiket");

const Groups = require("./segmentasi.group");

const { classifyTicket } = require("./segmentasi.classify.Ticket");

async function processTickets() {
  console.log("🚀 Memulai proses...");

  // =================================
  // LOAD GROUPS
  // =================================

  const groups = await Groups.find({})
    .select({
      WORKZONE: 1,
      SERVICE_AREA: 1,
      BRANCH: 1,
    })
    .lean();

  const groupMap = {};

  groups.forEach((group) => {
    const workzone = group.WORKZONE?.trim();

    if (!workzone) return;

    groupMap[workzone] = {
      SERVICE_AREA: group.SERVICE_AREA || null,

      BRANCH: group.BRANCH || null,
    };
  });

  console.log("✅ Group Mapping Loaded");

  // =================================
  // AMBIL SEMUA DATA
  // =================================

  const cursor = AllTickets.find({}).lean().cursor();

  let bulkOps = [];

  let total = 0;

  let skipped = 0;

  // =================================
  // LOOP DATA
  // =================================

  for await (const ticket of cursor) {
    const sourceTicket = ticket.source_ticket?.trim();

    const classificationFlag = ticket.classification_flag?.trim();

    const status = ticket.status?.trim();

    const classificationpath = ticket.classification_path?.trim();

    const customerType = ticket.customer_type?.trim();

    const ownergroup = ticket.owner_group?.trim();

    // =================================
    // PRIORITAS 1
    // SKIP PROACTIVE
    // =================================

    if (!["CUSTOMER", "GAMAS"].includes(sourceTicket)) {
      skipped++;
      continue;
    }

    // =================================
    // PRIORITAS 2
    // SKIP NON TECH
    // =================================

    if (classificationFlag !== "TECHNICAL") {
      skipped++;
      continue;
    }

    // =================================
    // PRIORITAS 3
    // SKIP STATUS
    // =================================

    if (["CLOSED", "RESOLVED", "MEDIACARE", "SALAMSIM"].includes(status)) {
      skipped++;

      continue;
    }

    // =================================
    // PRIORITAS 3
    // SKIP Z_PERMINTAAN_044
    // =================================

    //    if (["Z_PERMINTAAN_044"].includes(classificationpath)) {
    //      skipped++;
    //      continue;
    //    }

    if (["Z_PERMINTAAN_044", "C_REQ_001_002"].includes(classificationpath)) {
      skipped++;
      continue;
    }

    // =================================
    // PRIORITAS 4
    // SKIP customer_type
    // =================================

    //      if (["REGULER", "GOLD", "DIAMOND"].includes(customerType)) {
    //      skipped++;
    //      continue;
    //    }

    if (["ERM-RETENSI"].includes(ownergroup)) {
      skipped++;
      continue;
    }

    // =================================
    // CLASSIFICATION
    // =================================

    const jenis_tiket = classifyTicket(ticket);

    // =================================
    // GROUP LOOKUP
    // =================================

    const workzone = ticket.workzone?.trim();

    const groupData = groupMap[workzone] || {};

    // =================================
    // CLEAN DATA
    // =================================

    const cleanTicket = {
      incident: ticket.incident || null,

      reported_date: ticket.reported_date
        ? moment(ticket.reported_date).subtract(7, "hours").toDate()
        : null,

      workzone: workzone || null,

      service_no: ticket.service_no || null,

      service_type: ticket.service_type || null,
      last_update_worklog: ticket.last_update_worklog || null,
      worklog_summary: ticket.worklog_summary || null,
      summary: ticket.summary || null,
      perangkat: ticket.perangkat || null,
      device_name: ticket.device_name || null,
      region: ticket.region || null,
      witel: ticket.witel || null,
      incident_domain: ticket.incident_domain || null,
      description_actual_solution: ticket.description_actual_solution || null,

      booking_date: ticket.booking_date
        ? moment(ticket.booking_date).subtract(7, "hours").toDate()
        : null,

      jenis_tiket: jenis_tiket || null,

      status: status || null,

      guarantee_status: ticket.guarantee_status || null,

      SERVICE_AREA: groupData.SERVICE_AREA || null,

      BRANCH: groupData.BRANCH || null,
    };

    // =================================
    // BULK OPERATION
    // =================================

    bulkOps.push({
      updateOne: {
        filter: {
          incident: ticket.incident,
        },

        update: {
          $set: cleanTicket,
        },

        upsert: true,
      },
    });

    total++;

    // =================================
    // EXECUTE PER 1000
    // =================================

    if (bulkOps.length >= 1000) {
      await SegmentTickets.bulkWrite(bulkOps, {
        ordered: false,
      });

      console.log(`✅ ${total} tiket diproses`);

      bulkOps = [];
    }
  }

  // =================================
  // SISA DATA
  // =================================

  if (bulkOps.length > 0) {
    await SegmentTickets.bulkWrite(bulkOps, {
      ordered: false,
    });
  }

  // =================================
  // DONE
  // =================================

  console.log(`🎉 Selesai ${total} tiket`);

  console.log(`⏭️ Skip ${skipped} tiket`);
}

module.exports = processTickets;
