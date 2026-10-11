// Scheduler TTR, Officer, Ploting, B2B, dan HD.
const cron = require("node-cron");
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

const SCHEDULER_TIMEZONE = "Asia/Jakarta";

// Kedua jadwal memakai data segmentasi dan koleksi yang sama. Satu mutex
// bersama mencegah job 21:45 dan 22:00 berjalan paralel. Jika ada jadwal
// baru saat proses masih aktif, hanya job terbaru yang diantrikan.
let isSchedulerRunning = false;
let queuedJob = null;

async function runSchedulerJob({ label, includeTTR }) {
  const startedAt = Date.now();
  isSchedulerRunning = true;

  console.log(`▶️ Scheduler ${label} dimulai`);

  try {
    await jalanSegmentasi();
    console.log("segmentasi done");

    if (includeTTR) {
      await runTTR();
      console.log("ttr grup done");
    }

    await runTtrOfficer();
    console.log("remind officer done");
    await runPloting();
    console.log("remind plotingan teknisi done");
    await runTtrb2b();
    console.log("ttr b2b done");
    await runTtrHD();
    console.log("monitoring HD done");

    await clearSegmentTickets();
    await clearAllTickets();
    console.log(`✅ Scheduler ${label} selesai`);
  } catch (err) {
    console.error(`❌ Error Scheduler ${label}:`, err.message);
  } finally {
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(`⏱️ Scheduler ${label}: ${durationSeconds} detik`);

    isSchedulerRunning = false;

    const nextJob = queuedJob;
    queuedJob = null;
    if (nextJob) {
      console.log(
        `↪️ Menjalankan antrean Scheduler ${nextJob.label} setelah job sebelumnya selesai.`,
      );
      void runSchedulerJob(nextJob);
    }
  }
}

function requestSchedulerJob(job) {
  if (isSchedulerRunning) {
    queuedJob = job;
    console.warn(
      `⏳ Scheduler ${job.label} diantrikan karena job lain masih berjalan.`,
    );
    return;
  }

  void runSchedulerJob(job);
}

const dayJob = { label: "SIANG", includeTTR: true };
const nightJob = { label: "MALAM", includeTTR: true };
const cronOptions = { timezone: SCHEDULER_TIMEZONE };

// Setiap 15 menit pada pukul 08:00 s.d. 21:45.
cron.schedule("*/15 8-21 * * *", () => requestSchedulerJob(dayJob), cronOptions);

// Setiap jam pada pukul 22:00, 23:00, dan 00:00 s.d. 07:00.
cron.schedule("0 22-23,0-7 * * *", () => requestSchedulerJob(nightJob), cronOptions);

module.exports = {
  requestSchedulerJob,
  runSchedulerJob,
};
