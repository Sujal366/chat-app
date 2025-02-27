const mongoose = require("mongoose");

// Define Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }, // Store actual date object
});

module.exports = mongoose.model("Message", messageSchema);