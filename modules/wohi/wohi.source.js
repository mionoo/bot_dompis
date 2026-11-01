const mysql = require('mysql2/promise');
const { dayBounds } = require('./wohi.logic');
function createWohiSource(driver = mysql) {
  const config = key => process.env[`WOHI_MYSQL_${key}`] ?? process.env[`FFG_MYSQL_${key}`];
  for (const key of ['HOST', 'USER', 'PASSWORD', 'DATABASE'])
    if (!config(key)) throw new Error(`WOHI_CONFIG_${key}`);
  // New short-lived connection for each report; no stale worker connection.
  return { async fetchToday(now) {
    const bounds = dayBounds(now);
    const connection = await driver.createConnection({ host: config('HOST'), port: Number(config('PORT') || 3306),
      user: config('USER'), password: config('PASSWORD'), database: config('DATABASE'),
      dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, connectTimeout: 10000 });
    try {
      const [rows] = await connection.execute({ sql: `SELECT * FROM piloting_tickets
        WHERE reported_date >= ? AND reported_date < ? ORDER BY reported_date, incident`, timeout: 30000 },
      [bounds.start, bounds.end]);
      return rows;
    } finally { connection.destroy(); }
  } };
}
module.exports = { createWohiSource };
