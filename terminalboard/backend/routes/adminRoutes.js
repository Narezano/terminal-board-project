// backend/routes/adminRoutes.js
const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const Message = require("../models/Message");
const User = require("../models/User");

const router = express.Router();

// All admin endpoints require auth + admin
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/me
 * Quick admin check + whoami
 */
router.get("/me", (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

/**
 * GET /api/admin/messages?room=lobby&limit=50&before=2026-01-22T00:00:00.000Z
 * - newest-first (for admin view)
 * - supports simple pagination via "before" (createdAt)
 */
router.get("/messages", async (req, res) => {
  try {
    const room = String(req.query.room || "lobby").trim();
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const filter = { room };

    if (req.query.before) {
      const d = new Date(req.query.before);
      if (!isNaN(d.getTime())) {
        filter.createdAt = { $lt: d };
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ messages });
  } catch (err) {
    console.error("Admin fetch messages error:", err);
    res.status(500).json({ message: "Server error fetching admin messages" });
  }
});

/**
 * DELETE /api/admin/messages/:id
 */
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "INVALID MESSAGE ID" });
    }

    const deleted = await Message.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "MESSAGE NOT FOUND" });

    res.json({ message: "DELETED", deletedId: id });
  } catch (err) {
    console.error("Admin delete message error:", err);
    res.status(500).json({ message: "Server error deleting message" });
  }
});

/**
 * GET /api/admin/users?limit=50
 * Simple user list
 */
router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const users = await User.find({})
      .select("username email role createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error("Admin fetch users error:", err);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * body: { role: "user" | "admin" }
 */
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const role = String(req.body.role || "").trim();

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "INVALID USER ID" });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "INVALID ROLE" });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    )
      .select("username email role createdAt updatedAt")
      .lean();

    if (!updated) return res.status(404).json({ message: "USER NOT FOUND" });

    res.json({ message: "UPDATED", user: updated });
  } catch (err) {
    console.error("Admin update role error:", err);
    res.status(500).json({ message: "Server error updating role" });
  }
});

module.exports = router;
