const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const NETWORK_ERRORS = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
  'EAI_AGAIN', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH', 'ECONNABORTED', 'EPIPE']);
function classify(error) {
  const code = error?.response?.error_code ?? error?.code ?? error?.cause?.code;
  const status = Number(code);
  const retry = NETWORK_ERRORS.has(code) || error?.name === 'FetchError' ||
    status === 429 || (status >= 500 && status <= 599);
  const label = /^[A-Z0-9_]{1,64}$/.test(String(code)) ? String(code) :
    error?.name === 'FetchError' ? 'NETWORK_ERROR' : 'STARTUP_ERROR';
  return { retry: status === 401 || status === 409 ? false : retry, code: label,
    retryAfter: Number(error?.response?.parameters?.retry_after ?? error?.parameters?.retry_after) || 0 };
}
async function launchWithRetry(bot, label, options = {}) {
  const sleep = options.sleep || wait;
  const logger = options.logger || console;
  let failures = 0;
  while (true) {
    try {
      logger.log(`▶️ Startup bot ${label}`);
      // Telegraf launch remains pending while polling runs. Its callback occurs
      // after getMe, before deleteWebhook/polling, so do not call this "online".
      await bot.launch({}, () => logger.log(`✅ Identitas ${label} terverifikasi; memulai polling`));
      return;
    } catch (error) {
      const failure = classify(error);
      failures++;
      if (!failure.retry) {
        const hint = failure.code === '401' ? 'Periksa token bot.' :
          failure.code === '409' ? 'Periksa proses lain yang memakai bot ini.' : 'Periksa konfigurasi startup.';
        logger.error(`❌ Startup ${label} dihentikan | kode ${failure.code} | ${hint}`);
        return;
      }
      const delay = Math.max(Math.min(60000, 5000 * 2 ** Math.min(failures - 1, 4)),
        failure.retryAfter * 1000);
      logger.warn(`⚠️ Startup ${label} gagal | kode ${failure.code} | retry ${failures} dalam ${delay / 1000} detik`);
      await sleep(delay);
    }
  }
}
function startBots(bots, options = {}) {
  const sleep = options.sleep || wait;
  return bots.map(({ bot, label }, index) => (async () => {
    if (index) await sleep(index * 1500);
    await launchWithRetry(bot, label, options);
  })().catch(() => (options.logger || console).error(`❌ Pengelola startup ${label} gagal`)));
}
module.exports = { startBots, launchWithRetry, classify };
