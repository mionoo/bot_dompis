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
    console.log('FFG worker aktif: koneksi siap dan kunci sinkronisasi diperoleh');
    const worker = new FfgWorker(source);
    while (!stopped) {
      try {
        await worker.sync();
        console.log('FFG sinkronisasi berhasil:', new Date().toISOString());
      }
      catch (error) { console.warn('FFG sinkronisasi gagal:', diagnostic(error)); }
      if (!stopped) await new Promise(resolve => setTimeout(resolve,
        Number(process.env.FFG_SYNC_INTERVAL_MS || 60000)));
    }
  } finally { await source.close(); await mongoose.disconnect(); }
}
function diagnostic(error) {
  // Never print connection strings, request objects, or raw error messages.
  const known = /^(FFG_ENABLED must be 1|Missing FFG_MYSQL_[A-Z]+|Another FFG worker is running|FFG source lock lost|service_no must be text)$/;
  if (known.test(String(error?.message))) return error.message;
  if (typeof error?.code === 'number') return `kode ${error.code}`;
  if (typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code)) return error.code;
  const name = String(error?.name || 'Error');
  return /^[A-Za-z0-9_]{1,64}$/.test(name) ? name : 'Error';
}
if (require.main === module) main().catch(error => {
  console.error('FFG worker berhenti:', diagnostic(error)); process.exitCode = 1;
  void mongoose.disconnect();
});
module.exports = { main, diagnostic };
