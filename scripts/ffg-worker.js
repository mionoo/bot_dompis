require('dotenv').config();
const mongoose = require('mongoose');
const { State, Tickets, Deliveries } = require('../modules/ffg/ffg.models');
const { createSource } = require('../modules/ffg/ffg.source');
const { FfgWorker } = require('../modules/ffg/ffg.worker');
async function main() {
  if (process.env.FFG_ENABLED !== '1') throw new Error('FFG_ENABLED must be 1');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Tickets.init(), State.init(), Deliveries.init()]);
  const source = createSource();
  let stopped = false;
  process.once('SIGINT', () => { stopped = true; });
  process.once('SIGTERM', () => { stopped = true; });
  try {
    await source.lock();
    const worker = new FfgWorker(source);
    while (!stopped) {
      try { await worker.sync(); }
      catch (error) { console.warn('FFG synchronization failed (credentials omitted)'); }
      if (!stopped) await new Promise(resolve => setTimeout(resolve,
        Number(process.env.FFG_SYNC_INTERVAL_MS || 60000)));
    }
  } finally { await source.close(); await mongoose.disconnect(); }
}
if (require.main === module) main().catch(() => {
  console.error('FFG worker stopped: check configuration and connection'); process.exitCode = 1;
  void mongoose.disconnect();
});
module.exports = { main };
