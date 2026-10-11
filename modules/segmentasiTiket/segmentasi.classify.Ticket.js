// segmentasi.classify.Ticket.js

function classifyTicket(ticket) {
  const customerSegment = ticket.customer_segment?.trim();

  const serviceType = ticket.service_type?.trim();

  const customerType = ticket.customer_type?.trim();

  const sourceTicket = ticket.source_ticket?.trim();

  const summaryTicket = ticket.summary?.trim();

  // =================================
  // PRIORITAS 2
  // =================================

  // =================================
  // PRIORITAS 3
  // PL-TSEL
  // =================================

  if (customerSegment === "PL-TSEL") {
    return customerType || null;
  }

  // =================================
  // PRIORITAS 4
  // SEGMENT REGULER
  // =================================
  // DCS
  // DES
  // DGS
  // DPS
  // DSS
  // DWS
  // PL-TSEL
  // RBS
  // REG

  if (
    ["DES", "DCS", "DGS", "DPS", "DSS", "RBS", "REG"].includes(customerSegment)
  ) {
    const regularMap = {
      ASTINET: "DATIN",

      ASTINet: "DATIN",

      INTERNET: "INDIBIZ",

      IPTV: "INDIBIZ",

      MM_WIFI_ID: "WIFI_ID",

      VOICE: "INDIBIZ",

      "VPN IP": "DATIN",

      WIFI: "WIFI_ID",

      WIFI_AP: "WIFI_ID",

      WMS: "WIFI_ID",

      WMSLITE: "WIFI_ID",
    };

    return regularMap[serviceType] || null;
  }

  // =================================
  // PRIORITAS 5
  // DWS / INFRACO
  // =================================

  // =================================
  // PRIORITAS 5
  // DWS / INFRACO
  // =================================

  if (customerSegment === "DWS" || customerSegment === "TELKOM INFRACO") {
    // =================================
    // TOP_OLO
    // =================================

    const topOloServiceTypes = [
      "METRO-E",
      "METRO_E",
      "MM_METRO_ETHERNET",
      "MM_IP_TRANSIT",
      "ASTINET",
      "MM_ASTINET",
    ];

    if (topOloServiceTypes.includes(serviceType)) {
      return "TOP_OLO";
    }

    // =================================
    // NODE_B
    // SERVICE TYPE KOSONG / SITE
    // =================================

    if (!serviceType || serviceType === "SITE") {
      const summaryUpper = summaryTicket?.toUpperCase() || "";

      if (summaryUpper.includes("CRITICAL")) {
        return "NODE_CRITICAL";
      }

      if (summaryUpper.includes("LOW")) {
        return "NODE_B_LOW";
      }

      if (summaryUpper.includes("MAJOR")) {
        return "NODE_B_MAJOR";
      }

      if (summaryUpper.includes("MINOR")) {
        return "NODE_B_MINOR";
      }

      if (summaryUpper.includes("PREMIUM")) {
        return "NODE_B_PREMIUM";
      }

      if (summaryUpper.includes("CNQ")) {
        return "NODE_B_CNQ";
      }

      // Tidak ada keyword level
      return "NODE_B";
    }

    return null;
  }

  // =================================
  // GAMAS
  // =================================

  if (sourceTicket === "GAMAS") {
    const summaryUpper = summaryTicket?.toUpperCase() || "";

    if (summaryUpper.includes("FEEDER")) {
      return "GAMAS_FEEDER";
    }

    if (summaryUpper.includes("GPON")) {
      return "GAMAS_GPON";
    }

    if (summaryUpper.includes("DISTRIBUSI")) {
      return "GAMAS_DISTRIBUSI";
    }

    if (summaryUpper.includes("ODP")) {
      return "GAMAS_ODP";
    }

    return "GAMAS";
  }

  return null;
}

module.exports = {
  classifyTicket,
};
