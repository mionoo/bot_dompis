const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {},
    {
      strict: false,
      collection: "groups",
    }
  );

module.exports =
  mongoose.models.groups ||
  mongoose.model(
    "groups",
    schema
  );