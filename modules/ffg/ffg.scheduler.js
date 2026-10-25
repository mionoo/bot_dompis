// Jadwal otomatis FFG dipusatkan di test.js untuk menghindari cron ganda.
function startFfgScheduler() {
  console.warn('Jadwal FFG dikelola oleh test.js; cron terpisah tidak dijalankan.');
}
module.exports = { startFfgScheduler };
