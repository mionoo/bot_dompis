const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: "all_tickets",
  }
);

module.exports =
  mongoose.models.all_tickets ||
  mongoose.model(
    "all_tickets",
    schema
  );