function planReports(date, ffgEnabled) {
  const hour = (date.getUTCHours() + 7) % 24;
  const minute = date.getUTCMinutes();
  const operational = (hour >= 8 && hour < 22) || minute === 0;
  return { scheduledAt: new Date(date), operational,
    label: hour >= 8 && hour < 22 ? 'SIANG' : 'MALAM',
    includeTTR: operational, includeGamas: operational && minute === 0,
    ffgActive: ffgEnabled, ffgHourly: ffgEnabled && minute === 0 };
}
function createReportScheduler(deps, queue, logger = console) {
  async function runSchedulerJob(job) {
    const scheduledAt = job.scheduledAt || new Date();
    if (job.operational !== false) {
      try {
        await deps.segment();
        if (job.includeTTR) await deps.ttr();
        await deps.officer();
        await deps.ploting();
        await deps.b2b();
        await deps.hd();
        if (job.includeGamas) await deps.gamas();
        await deps.clearSegment();
        await deps.clearAll();
      } catch (_) { logger.error(`❌ Scheduler ${job.label}: proses operasional gagal; FFG tetap diperiksa`); }
    }
    for (const mode of ['active', 'hourly']) {
      if (!(mode === 'active' ? job.ffgActive : job.ffgHourly)) continue;
      try { await deps.ffg(mode, scheduledAt, { checkedAt: new Date() }); }
      catch (_) { logger.error(`❌ FFG ${mode} gagal pada scheduler`); }
    }
  }
  function requestSchedulerJob(job) {
    const planned = { ...job, scheduledAt: job.scheduledAt || new Date() };
    return queue.enqueue(`schedule:${planned.scheduledAt.toISOString()}`,
      `${planned.label} ${planned.scheduledAt.toISOString()}`, () => runSchedulerJob(planned));
  }
  return { requestSchedulerJob, runSchedulerJob: requestSchedulerJob };
}
module.exports = { planReports, createReportScheduler };
