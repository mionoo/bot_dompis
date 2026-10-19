const { Nakers } = require('../../models/users');

// Match complete roles only, with case-insensitive spelling and flexible
// whitespace. Keep the stored data unchanged.
const PLOTTING_LEVEL = /^\s*(?:HSA|KORLAP|OSA|OFFICER\s+3)\s*$/i;

async function getPicMappingByHSA(model = Nakers) {
  const data = await model.find({
    SERVICE_AREA: { $exists: true, $nin: ['', null] },
    BRANCH: { $exists: true, $nin: ['', null] },
    ID_TELEGRAM: { $exists: true, $nin: ['', null] },
    LEVEL: { $regex: PLOTTING_LEVEL },
  }).lean();
  const mapping = {};
  for (const user of data) {
    const hsa = String(user.SERVICE_AREA || '').trim().toUpperCase();
    const branch = String(user.BRANCH || '').trim().toUpperCase();
    const chatId = String(user.ID_TELEGRAM || '').trim();
    if (!hsa || !branch || !chatId) continue;
    if (!mapping[hsa]) mapping[hsa] = [];
    mapping[hsa].push({ chatId, topic: user.ID_TOPIC_GRUP, branch });
  }
  return mapping;
}

module.exports = { getPicMappingByHSA, PLOTTING_LEVEL };
