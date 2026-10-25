// Scheduler TTR, Officer, Ploting, B2B, dan HD.
const cron = require("node-cron");
const { runGamas } = require("./modules/gamas/gamas.service");
const { runTTR } = require("./modules/ttr/ttr.service");
const { runTtrOfficer } = require("./modules/ttrOfficer/ttrOfficer.service");
const { runTtrb2b } = require("./modules/ttrb2b/ttrb2b.service");
const { runTtrHD } = require("./modules/ttrHD/ttrHD.service");
const { runPloting } = require("./modules/ploting/ploting.runner");
const { jalanSegmentasi } = require("./modules/segmentasiTiket/segmentasi.start");
const {
  clearSegmentTickets,
  clearAllTickets,
} = require("./modules/segmentasiTiket/segmentasi.clear");

const { runFfg } = require("./modules/ffg/ffg.service");
const { reportQueue } = require("./core/reportQueue");
const { planReports, createReportScheduler } = require("./core/reportSchedule");
const scheduler = createReportScheduler({
  segment: jalanSegmentasi, ttr: runTTR, officer: runTtrOfficer,
  ploting: runPloting, b2b: runTtrb2b, hd: runTtrHD, gamas: runGamas,
  clearSegment: clearSegmentTickets, clearAll: clearAllTickets, ffg: runFfg,
}, reportQueue);

// Satu cron sepanjang hari. Malam di luar menit 00 hanya menjalankan FFG.
cron.schedule("*/15 * * * *", context => {
  const job = planReports(context.date, process.env.FFG_ENABLED === "1");
  if (!job.operational && !job.ffgActive) return;
  void scheduler.requestSchedulerJob(job).catch(() => console.error("Scheduler gagal diproses"));
}, { timezone: "Asia/Jakarta" });

module.exports = scheduler;
