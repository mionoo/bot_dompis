const ExcelJS = require("exceljs");
const { sla } = require("./ffg.logic");
async function buildExcel(tickets, now = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dompis FFG";
  const sheet = workbook.addWorksheet("Tiket FFG");
  const extras = [
    "SLA_SEGMENT",
    "SLA_TARGET_HOURS",
    "SLA_ELAPSED_HOURS",
    "SLA_REMAINING_HOURS",
    "SLA_LABEL",
    "FFG_SHEET",
    "FFG_TYPE",
    "FFG_CHECKED_AT",
    "SYNCED_AT",
  ];
  const keys = [
    ...new Set([
      "incident",
      "service_no",
      "customer_name",
      "status",
      ...tickets.flatMap((t) => Object.keys(t.ticket || {})),
    ]),
  ];
  sheet.columns = [...keys, ...extras].map((key) => ({
    header: key,
    key,
    width: key === "customer_name" ? 32 : 22,
  }));
  for (const ticket of tickets) {
    const analysis = sla(ticket, now);
    const row = {
      ...ticket.ticket,
      incident: ticket.incident,
      service_no: String(ticket.service_no),
      status: ticket.status,
      SLA_SEGMENT: analysis.segment,
      SLA_TARGET_HOURS: analysis.target,
      SLA_ELAPSED_HOURS: analysis.elapsed,
      SLA_REMAINING_HOURS: analysis.remaining,
      SLA_LABEL: analysis.label,
      FFG_SHEET: ticket.ffg?.source_sheet,
      FFG_TYPE: ticket.ffg?.service_type,
      FFG_CHECKED_AT: ticket.matched_at?.toISOString(),
      SYNCED_AT: ticket.synced_at?.toISOString(),
    };
    // Strings remain literal Excel text, including leading zeros and '='.
    sheet.addRow(
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value == null
            ? ""
            : typeof value === "object"
              ? JSON.stringify(value)
              : value,
        ]),
      ),
    );
  }
  sheet.getColumn("service_no").numFmt = "@";
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF17365D" },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: { row: Math.max(1, sheet.rowCount), column: sheet.columnCount },
  };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
module.exports = { buildExcel };
