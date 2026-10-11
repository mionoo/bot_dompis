//user.js

const mongoose = require("mongoose");

// SKEMA
// const skemaNakers = new mongoose.Schema({
//   POSITION_NAME: String,
//   POSITION_TITLE: String,
//   NIK: String,
//   NAMA: String,
//   SEKTOR: String,
//   RAYON: String,
//   SERVICE_AREA: String,
//   BRANCH: String,
//   REGIONAL: String,
//   AREA: String,
//   LEVEL: String,
//   LABOUR: String,
//   ID_TELEGRAM: String,
// });

const skemaNakers = new mongoose.Schema({
  POSITION_NAME: String,
  POSITION_TITLE: String,
  NIK: String,
  NAMA: String,
  SERVICE_AREA: String,
  BRANCH: String,
  REGIONAL: String,
  AREA: String,
  LEVEL: String,
  SEKTOR: String,
  ID_TELEGRAM: String,
  LABOUR: String,
});

const newNaker = new mongoose.Schema({
  NIK: String,
  BRANCH: String,
  SERVICE_AREA: String,
  LEVEL: String,
  REGIONAL: String,
  LABOUR: String,
});

//MODEL
const Nakers = mongoose.model("nakers", skemaNakers);

const cariNakers = async (query) => {
  try {
    return await Nakers.findOne(query).lean(); // lean biar ringan
  } catch (error) {
    throw error;
  }
};

module.exports = { Nakers, cariNakers };
