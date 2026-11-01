const ExcelJS = require('exceljs');
const { summarize, summarizeSources, sourceGroup } = require('./wohi.logic');
async function buildWohiExcel(tickets) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dompis WO HI';
  const summary = workbook.addWorksheet('Ringkasan');
  summary.columns = [{ header: 'Kelompok Sumber', key: 'sourceGroup', width: 24 },
    { header: 'Kategori', key: 'category', width: 28 },
    { header: 'OPEN', key: 'open', width: 14 }, { header: 'CLOSE', key: 'close', width: 14 },
    { header: 'TOTAL', key: 'total', width: 14 }];
  const counts = summarize(tickets);
  for (const group of summarizeSources(tickets)) {
    group.categories.forEach(row => summary.addRow({ sourceGroup: group.name, ...row }));
    const subtotal = summary.addRow({ sourceGroup: group.name, category: 'TOTAL', ...group.total });
    subtotal.font = { bold: true };
  }
  summary.addRow({ sourceGroup: 'SEMUA', category: 'TOTAL KESELURUHAN', ...counts.total }).font = { bold: true };
  const details = workbook.addWorksheet('Semua Tiket');
  const columns = [...new Set(['incident', 'WOHI_SOURCE_GROUP', 'source_ticket', 'WOHI_CATEGORY', 'WOHI_STATUS', 'status',
    'service_no', 'customer_name', 'WOHI_BRANCH', 'WOHI_SERVICE_AREA', 'workzone',
    'reported_date', ...tickets.flatMap(ticket => Object.keys(ticket))])].filter(key => key !== 'WOHI_ZONEBOT');
  details.columns = columns.map(key => ({ header: key, key, width: key === 'customer_name' ? 32 : 24 }));
  for (const ticket of tickets) details.addRow(Object.fromEntries(columns.map(key => {
    const value = key === 'WOHI_SOURCE_GROUP' ? sourceGroup(ticket.source_ticket) : ticket[key];
    return [key, value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : value];
  })));
  details.getColumn('service_no').numFmt = '@';
  for (const sheet of [summary, details]) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: { row: sheet.rowCount, column: sheet.columnCount } };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
module.exports = { buildWohiExcel };
