const mysql = require('mysql2/promise');
function createSource() {
  for (const key of ['HOST', 'USER', 'PASSWORD', 'DATABASE']) {
    if (!process.env[`FFG_MYSQL_${key}`]) throw new Error(`Missing FFG_MYSQL_${key}`);
  }
  const pool = mysql.createPool({ host: process.env.FFG_MYSQL_HOST,
    port: Number(process.env.FFG_MYSQL_PORT || 3306), user: process.env.FFG_MYSQL_USER,
    password: process.env.FFG_MYSQL_PASSWORD, database: process.env.FFG_MYSQL_DATABASE,
    connectionLimit: 2, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
    connectTimeout: 10000 });
  let connection;
  async function execute(sql, params) {
    if (!connection) throw new Error('FFG source lock not acquired');
    const [lock] = await connection.query("SELECT IS_USED_LOCK('dompis_ffg_node_worker') = CONNECTION_ID() AS owned");
    if (lock[0].owned !== 1) throw new Error('FFG source lock lost');
    return connection.execute(sql, params);
  }
  return {
    async lock() {
      connection = await pool.getConnection();
      const [rows] = await connection.query("SELECT GET_LOCK('dompis_ffg_node_worker', 0) AS acquired");
      if (rows[0].acquired !== 1) throw new Error('Another FFG worker is running');
    },
    async byIncidents(incidents) {
      if (!incidents.length) return [];
      const [rows] = await execute({ sql: `SELECT * FROM piloting_tickets
        WHERE incident IN (${incidents.map(() => '?').join(',')})`, timeout: 15000 }, incidents);
      return rows;
    },
    async close() {
      if (connection) connection.destroy();
      await pool.end();
    },
  };
}
module.exports = { createSource };
