function startFfgScheduler() {
  if (process.env.FFG_ENABLED !== "1") return;
  const cron = require("node-cron");
  const { runFfg } = require("./ffg.service");
  let running = false;
  return cron.schedule(
    "*/15 * * * *",
    async () => {
      if (running) {
        console.warn("FFG previous report still running");
        return;
      }
      running = true;
      const now = new Date();
      try {
        for (const mode of now.getUTCMinutes() === 0
          ? ["active", "hourly"]
          : ["active"]) {
          try {
            await runFfg(mode, now);
          } catch (error) {
            console.error(`FFG ${mode} report failed (credentials omitted)`);
          }
        }
      } finally {
        running = false;
      }
    },
    { timezone: "Asia/Jakarta" },
  );
}
module.exports = { startFfgScheduler };
