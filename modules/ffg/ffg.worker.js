const { Tickets, State } = require('./ffg.models');
const { snapshot } = require('./ffg.logic');
class FfgWorker {
  constructor(source) { this.source = source; }
  async sync() {
    // Promote validation flags from old snapshots without inferring OPEN.
    await Tickets.updateMany({ status_validasi: { $exists: false },
      'ticket.status_validasi': { $type: 'string' } }, [{ $set: {
      status_validasi: { $toUpper: { $trim: { input: '$ticket.status_validasi' } } },
    } }], { updatePipeline: true });
    let batch = [];
    for await (const doc of Tickets.find({ status_validasi: 'OPEN' }).select('incident').lean().cursor()) {
      batch.push(doc.incident);
      if (batch.length === 100) { await this.refresh(batch); batch = []; }
    }
    if (batch.length) await this.refresh(batch);
    await State.updateOne({ _id: 'sync' }, { $set: { completed_at: new Date() } }, { upsert: true });
  }
  async refresh(incidents) {
    const rows = await this.source.byIncidents(incidents);
    for (const row of rows) {
      const data = snapshot(row);
      // Read final CLOSE from MySQL once; never filter it from the source lookup.
      await Tickets.updateOne({ incident: row.incident, status_validasi: 'OPEN' }, { $set: data });
    }
    const missing = incidents.filter(id => !rows.some(row => row.incident === id));
    if (missing.length) await Tickets.updateMany({ incident: { $in: missing } },
      { $set: { sync_error: 'Incident missing from source' } });
    if (rows.length) await Tickets.updateMany({ incident: { $in: rows.map(r => r.incident) } },
      { $unset: { sync_error: '' } });
  }
}
module.exports = { FfgWorker };
