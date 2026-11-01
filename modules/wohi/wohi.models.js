const mongoose = require('mongoose');
const schema = new mongoose.Schema({ BRANCH: { type: String, required: true },
  ID_GRUP: { type: String, required: true }, ID_TOPIC_GRUP: { type: String, default: null },
  NAMA_GRUP: String, STATUS: { type: String, default: 'ACTIVE' } }, { collection: 'wohi_groups' });
schema.index({ BRANCH: 1, ID_GRUP: 1, ID_TOPIC_GRUP: 1 }, { unique: true });
const deliveries = new mongoose.Schema({ _id: String }, { strict: false, collection: 'wohi_deliveries' });
module.exports = {
  WohiGroups: mongoose.models.WohiGroup || mongoose.model('WohiGroup', schema),
  WohiDeliveries: mongoose.models.WohiDelivery || mongoose.model('WohiDelivery', deliveries),
};
