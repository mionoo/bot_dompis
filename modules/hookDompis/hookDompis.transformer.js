function transformEvent(data) {

  var baseTicket = {
    incident: data.ticket?.incident || null,
    customer_name: data.ticket?.customer_name || null,
    customer_type: data.ticket?.customer_type || null,
    service_no: data.ticket?.service_no || null,
    workzone: data.ticket?.workzone || null,
    owner_group: data.ticket?.owner_group || null
    
  };

  var newTech = data.new_technician
    ? {
      nik: data.new_technician.nik,
      nama: data.new_technician.nama?.trim()
    }
    : null;

  var oldTech = data.old_technician
    ? {
      nik: data.old_technician.nik,
      nama: data.old_technician.nama?.trim()
    }
    : null;

  var admin = data.admin
    ? {
      nama: data.admin?.nama,
      action: data.admin?.action
    }
    : null;

  // =========================
  // 🔥 TAMBAHAN: DETEKSI ASSIGN TYPE
  // =========================
  var assignType = null;

  if (admin?.nama) {
    if (/AUTO-ASSIGN/i.test(admin.nama)) {
      assignType = "AUTO ASSIGN SYSTEM";
    } else {
      assignType = "MANUAL USER";
    }
  }

  // =========================
  // ASSIGN / REASSIGN
  // =========================
  if (data.event_type === "TICKET_ASSIGNED") {

    return {
      type: oldTech ? "REASSIGN" : "ASSIGN",
      assign_type: assignType, // 🔥 hasil tambahan
      ticket: baseTicket,
      admin: admin,
      new_technician: newTech,
      old_technician: oldTech,
      event_id: data.event_id
    };
  }

  // =========================
  // STATUS CHANGE
  // =========================
  if (data.event_type === "TICKET_STATUS_CHANGED") {

    var oldStatus = data.status?.old_hasil_visit;
    var newStatus = data.status?.new_hasil_visit;

    if (oldStatus === "ASSIGNED" && newStatus === "ON_PROGRESS") {
      return {
        type: "PICKUP_ORDER",
        ticket: baseTicket,
        new_technician: newTech,
        old_technician: oldTech,
        event_id: data.event_id
      };
    }

    if (newStatus === "PENDING") {
      return {
        type: "PENDING",
        ticket: baseTicket,
        pendingReason: data.status?.pending_reason || null,
        new_technician: newTech,
        old_technician: oldTech,
        event_id: data.event_id
      };
    }

    if (oldStatus === "PENDING" && newStatus === "ON_PROGRESS") {
      return {
        type: "RESUME",
        ticket: baseTicket,
        new_technician: newTech,
        old_technician: oldTech,
        event_id: data.event_id
      };
    }
  }

  // =========================
  // CLOSE
  // =========================
  if (data.event_type === "TICKET_CLOSED") {
    return {
      type: "CLOSE_TICKET",
      ticket: baseTicket,
      new_technician: newTech,
      old_technician: oldTech,
      rca: data.status?.rca || null,
      sub_rca: (data.status?.sub_rca || "").trim() || null,
      detail: data.status?.detail_perbaikan || null,
      event_id: data.event_id
    };
  }

  return {
    type: "UNKNOWN",
    raw: data
  };
}

module.exports = { transformEvent };