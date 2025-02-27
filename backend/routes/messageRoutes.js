const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

// API endpoint for fetching paginated messages
router.get("/getMessages", async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20; // Default: 20 messages per batch

    const skip = (page - 1) * limit;

    // Fetch messages in descending order (latest first)
    const messages = await Message.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse()); // Reverse so oldest messages are at the top
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;