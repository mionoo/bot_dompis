//group.js

const mongoose = require('mongoose')



// SKEMA
const skemagrops = new mongoose.Schema({
    WORKZONE: String,
    SERVICE_AREA: String,
    BRANCH: String,
    REGION_TSEL: String,
    ZONEBOT: String,

  });


  //MODEL
const Groups = mongoose.model("groups", skemagrops);



const cariGroups = async (query) => {
  return await Groups.find(query).lean()
}

module.exports = {Groups, cariGroups}