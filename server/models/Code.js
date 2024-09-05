const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, expires: "7d" },
});

const Code = mongoose.model("Code", codeSchema);

module.exports = Code;
