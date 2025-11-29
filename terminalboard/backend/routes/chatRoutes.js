// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET /api/chat/messages?room=lobby
router.get("/messages", async (req, res) => {
  try {
    const room = req.query.room || "lobby";

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 }) // newest first
      .limit(50) // last 50 messages
      .lean();

    // reverse so frontend sees oldest → newest
    res.json({
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

module.exports = router;
