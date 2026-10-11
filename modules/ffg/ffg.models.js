const mongoose = require('mongoose');
const tickets = new mongoose.Schema({
  incident: { type: String, required: true, unique: true },
  reported_at: { type: Date, index: true }, status: String, workzone: String,
  status_validasi: { type: String, index: true },
}, { strict: false, collection: 'ffg_tickets' });
const state = new mongoose.Schema({ _id: String }, { strict: false, collection: 'ffg_state' });
const deliveries = new mongoose.Schema({ _id: String, status: String },
  { strict: false, collection: 'ffg_deliveries' });
const groups = new mongoose.Schema({
  BRANCH: { type: String, required: true }, ID_GRUP: { type: String, required: true },
  NAMA_GRUP: String, ID_TOPIC_GRUP: { type: String, default: null },
  STATUS: { type: String, default: 'ACTIVE' },
}, { collection: 'ffg_groups' });
groups.index({ ID_GRUP: 1, ID_TOPIC_GRUP: 1, BRANCH: 1 }, { unique: true });
module.exports = {
  FfgGroups: mongoose.models.FfgGroup || mongoose.model('FfgGroup', groups),
  Tickets: mongoose.models.FfgTicket || mongoose.model('FfgTicket', tickets),
  State: mongoose.models.FfgState || mongoose.model('FfgState', state),
  Deliveries: mongoose.models.FfgDelivery || mongoose.model('FfgDelivery', deliveries),
};
