// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET /api/chat/messages?room=lobby
router.get("/messages", async (req, res) => {
  try {
    const room = req.query.room || "lobby";

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

module.exports = router;
