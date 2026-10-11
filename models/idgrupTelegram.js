//idgrupTelegram.js

const mongoose = require('mongoose')

const skemaidgrup = new mongoose.Schema({
    SERVICE_AREA: String,
    BRANCH: String,
    ID_GRUP: String,
    NAMA_GRUP: String,
    NAMA_SUB_TOPIC: String,
    ID_TOPIC_GRUP: String,
    TIPE_GRUP: String,
    STATUS: String,
})

const skemaidgrupKAWAL = new mongoose.Schema({
    SERVICE_AREA: String,
    BRANCH: String,
    ID_GRUP: String,
    NAMA_GRUP: String,
    NAMA_SUB_TOPIC: String,
    ID_TOPIC_GRUP: String,
    TIPE_GRUP: String,
    STATUS: String,
})

const skemaidgrupB2B = new mongoose.Schema({
    SERVICE_AREA: String,
    BRANCH: String,
    ID_GRUP: String,
    NAMA_GRUP: String,
    NAMA_SUB_TOPIC: String,
    ID_TOPIC_GRUP: String,
    TIPE_GRUP: String,
    STATUS: String,
})

const skemaidgrupMonHD = new mongoose.Schema({
    SERVICE_AREA: String,
    BRANCH: String,
    ID_GRUP: String,
    NAMA_GRUP: String,
    NAMA_SUB_TOPIC: String,
    ID_TOPIC_GRUP: String,
    TIPE_GRUP: String,
    STATUS: String,
})

const idgrupKawal = mongoose.model("idgrupKawal", skemaidgrupKAWAL);


const Idgrups = mongoose.model("idgroups", skemaidgrup);

const Idgrupb2b = mongoose.model("idgroupb2b", skemaidgrupB2B);

const IdgrupHD = mongoose.model("IdgroupHD", skemaidgrupMonHD);

const cariidgroup = async (query) => {
  return await Idgrups.find(query).lean()
}

module.exports = {Idgrups, cariidgroup, idgrupKawal, Idgrupb2b, IdgrupHD}