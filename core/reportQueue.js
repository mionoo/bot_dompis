function createReportQueue(logger = console) {
  let tail = Promise.resolve();
  const pending = new Map();
  function enqueue(key, label, run) {
    if (pending.has(key)) return pending.get(key);
    const queuedAt = Date.now();
    logger.log(`⏳ Antrean laporan: ${label}`);
    const job = tail.then(async () => {
      const startedAt = Date.now();
      logger.log(`▶️ Laporan mulai: ${label} | menunggu ${Math.round((startedAt - queuedAt) / 1000)} detik`);
      try { return await run(); }
      finally { logger.log(`⏱️ Laporan selesai: ${label} | ${Math.round((Date.now() - startedAt) / 1000)} detik`); }
    });
    pending.set(key, job);
    // A failed job must release the queue and never poison later jobs.
    tail = job.then(() => { pending.delete(key); }, () => { pending.delete(key); });
    return job;
  }
  return { enqueue, idle: () => tail };
}
const reportQueue = createReportQueue();
module.exports = { createReportQueue, reportQueue };
