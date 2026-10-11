const mongoose = require('mongoose')



// SKEMA
const skemaMaphsa = new mongoose.Schema({
    WORKZONE: String,
    SERVICE_AREA: String,
    BRANCH: String,
    REGION_TSEL: String
  });


  //MODEL
const map_hsa = mongoose.model("groups", skemagrops);



const carimaphsa = async (query) => {
  return await map_hsa.find(query).lean()
}

module.exports = {skemaMaphsa, carimaphsa}

