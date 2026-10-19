// Keep long-running reports outside Telegraf's per-update handler timeout.
async function startManualReport(ctx, { command, message, prepare, run }, options = {}) {
  const logger = options.logger || console;
  const schedule = options.schedule || setImmediate;
  await ctx.reply(message);
  schedule(() => {
    const startedAt = Date.now();
    Promise.resolve()
      .then(() => prepare())
      .then(() => run(ctx))
      .then(() => logger.log(`✅ Proses manual ${command} selesai | ${Math.round((Date.now() - startedAt) / 1000)} detik`))
      .catch(error => {
        const code = String(error?.code || error?.name || 'ERROR');
        logger.error(`❌ Proses manual ${command} gagal | ${/^[A-Za-z0-9_]{1,64}$/.test(code) ? code : 'ERROR'}`);
      });
  });
}
module.exports = { startManualReport };
