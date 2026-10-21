const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ID_GRUP: String,
  ID_TOPIC_GRUP: { type: String, default: null },
  NAMA_GRUP: String,
  BOT_ID: String,
  STATUS: { type: String, default: 'ACTIVE' },
}, { collection: 'idgroupgamas', timestamps: true });
schema.index({ ID_GRUP: 1, ID_TOPIC_GRUP: 1 }, { unique: true });
module.exports = mongoose.models.IdgroupGamas || mongoose.model('IdgroupGamas', schema);
