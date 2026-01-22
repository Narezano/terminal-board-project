// backend/server.js
// Main Express + Socket.IO server for TerminalBoard
// - REST API routes: /api/auth, /api/chat, /api/admin, /api/gifs/search
// - Socket.IO: real-time chat messaging + room users + typing indicator

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const server = http.createServer(app);

/**
 * Socket.IO server
 */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Connect to MongoDB (uses MONGO_URI from .env)
connectDB();

/* ===========================
   Global middleware
   =========================== */

// REST CORS (allows frontend to call backend, including Authorization header)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ===========================
   REST routes
   =========================== */

// Health check (quick way to verify backend is alive)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TerminalBoard API is running" });
});

// API modules
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

/* ===========================
   External REST proxy: GIPHY
   GET /api/gifs/search?q=hello&limit=12
   =========================== */
app.get("/api/gifs/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 12), 24);

    if (!q) return res.status(400).json({ message: "Missing q parameter" });

    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Missing GIPHY_API_KEY in env" });
    }

    const url =
      "https://api.giphy.com/v1/gifs/search" +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(q)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&rating=g`;

    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      console.error("GIPHY error:", r.status, txt);
      return res.status(502).json({ message: "GIPHY request failed" });
    }

    const json = await r.json();

    // Return a small, frontend-friendly shape
    const results = (json.data || []).map((gif) => {
      const preview =
        gif?.images?.fixed_width_small?.url ||
        gif?.images?.downsized_small?.mp4 ||
        gif?.images?.original?.url ||
        "";

      const full =
        gif?.images?.fixed_width?.url ||
        gif?.images?.downsized?.url ||
        gif?.images?.original?.url ||
        "";

      return { id: gif.id, title: gif.title || "", previewUrl: preview, url: full };
    });

    res.json({ results });
  } catch (err) {
    console.error("Error /api/gifs/search:", err);
    res.status(500).json({ message: "Server error searching gifs" });
  }
});

/* ===========================
   Socket.IO: rooms + live chat
   =========================== */

// Track connected users per room (socket.id -> username)
const usersInRoom = new Map();

function broadcastRoomUsers(room) {
  const roomMap = usersInRoom.get(room);
  const users = roomMap ? Array.from(roomMap.values()) : [];
  io.to(room).emit("roomUsers", { room, users });
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Fallback username if client doesn't send one
  const username =
    (socket.handshake.query &&
      typeof socket.handshake.query.username === "string" &&
      socket.handshake.query.username.trim()) ||
    "anon";

  // Join a room + broadcast the user list
  socket.on("joinRoom", ({ room, username: uFromClient } = {}) => {
    try {
      const safeRoom =
        typeof room === "string" && room.trim() ? room.trim() : "lobby";

      const safeUser =
        typeof uFromClient === "string" && uFromClient.trim()
          ? uFromClient.trim()
          : username;

      socket.join(safeRoom);

      if (!usersInRoom.has(safeRoom)) usersInRoom.set(safeRoom, new Map());
      usersInRoom.get(safeRoom).set(socket.id, safeUser);

      broadcastRoomUsers(safeRoom);
    } catch (err) {
      console.error("Error joinRoom:", err);
    }
  });

  // Leave room + broadcast updated user list
  socket.on("leaveRoom", ({ room } = {}) => {
    try {
      const safeRoom =
        typeof room === "string" && room.trim() ? room.trim() : null;
      if (!safeRoom) return;

      socket.leave(safeRoom);

      const roomMap = usersInRoom.get(safeRoom);
      if (!roomMap) return;

      roomMap.delete(socket.id);
      if (roomMap.size === 0) usersInRoom.delete(safeRoom);
      else broadcastRoomUsers(safeRoom);
    } catch (err) {
      console.error("Error leaveRoom:", err);
    }
  });

  // Typing indicator (debounced on client)
  socket.on("typing", (payload) => {
    try {
      const who = payload?.username;
      const whichRoom = payload?.room;
      if (!who || typeof who !== "string") return;
      if (!whichRoom || typeof whichRoom !== "string") return;

      socket.to(whichRoom).emit("typing", { username: who });
    } catch (err) {
      console.error("Error handling typing:", err);
    }
  });

  /**
   * Chat message handler:
   * - Supports "text" and "gif" messages
   * - Saves messages to Mongo
   * - Broadcasts to room
   */
  socket.on("chatMessage", async (payload) => {
    try {
      const { author, text, room, type, mediaUrl } = payload || {};
      if (!author || !author.trim()) return;

      const safeRoom =
        typeof room === "string" && room.trim() ? room.trim() : "lobby";

      const safeType =
        type === "gif" || type === "text" ? type : mediaUrl ? "gif" : "text";

      const safeText = typeof text === "string" ? text.slice(0, 500) : "";
      const safeMedia = typeof mediaUrl === "string" ? mediaUrl.slice(0, 2000) : "";

      // Must contain either text OR media URL
      if (!safeText.trim() && !safeMedia.trim()) return;

      const msgDoc = await Message.create({
        author: author.trim(),
        type: safeType,
        text: safeText,
        mediaUrl: safeMedia,
        room: safeRoom,
      });

      // Emit a safe, frontend-friendly payload
      io.to(safeRoom).emit("chatMessage", {
        id: msgDoc._id,
        author: msgDoc.author,
        type: msgDoc.type,
        text: msgDoc.text,
        mediaUrl: msgDoc.mediaUrl,
        room: msgDoc.room,
        createdAt: msgDoc.createdAt,
      });
    } catch (err) {
      console.error("Error handling chatMessage:", err);
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    for (const [roomName, roomMap] of usersInRoom.entries()) {
      if (roomMap.has(socket.id)) {
        roomMap.delete(socket.id);

        if (roomMap.size === 0) usersInRoom.delete(roomName);
        else broadcastRoomUsers(roomName);
      }
    }
  });
});

/* ===========================
   Start server
   =========================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
