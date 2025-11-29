// backend/server.js
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

// Socket.io instance
const io = new Server(server, {
  cors: {
    origin: "*", // for dev; later lock this to your Vercel URL
    methods: ["GET", "POST"],
  },
});

// connect to MongoDB
connectDB();

// middleware
app.use(
  cors({
    origin: "*", // for dev; later you can lock this to your Vercel URL
  })
);
app.use(express.json());

// routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TerminalBoard API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

// ==============================
// Socket.io chat logic (one room)
// ==============================

/**
 * usersInRoom: Map<roomName, Map<socketId, username>>
 * For now we only use room "lobby"
 */
const usersInRoom = new Map();

function broadcastRoomUsers(room) {
  const roomMap = usersInRoom.get(room);
  const users = roomMap ? Array.from(roomMap.values()) : [];

  io.to(room).emit("roomUsers", {
    room,
    users, // array of usernames
  });
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const room = "lobby";
  const username =
    (socket.handshake.query &&
      typeof socket.handshake.query.username === "string" &&
      socket.handshake.query.username.trim()) ||
    "anon";

  socket.join(room);

  // Add to presence map
  if (!usersInRoom.has(room)) {
    usersInRoom.set(room, new Map());
  }
  const roomMap = usersInRoom.get(room);
  roomMap.set(socket.id, username);

  // Notify everyone in the room about current users
  broadcastRoomUsers(room);

  // Listen for chat messages from clients
  socket.on("chatMessage", async (payload) => {
    try {
      const { author, text } = payload || {};
      if (!author || !text || !text.trim()) return;

      const msgDoc = await Message.create({
        author,
        text: text.trim(),
        room,
      });

      const safeMsg = {
        id: msgDoc._id,
        author: msgDoc.author,
        text: msgDoc.text,
        room: msgDoc.room,
        createdAt: msgDoc.createdAt,
      };

      // Broadcast to everyone in room (including sender)
      io.to(room).emit("chatMessage", safeMsg);
    } catch (err) {
      console.error("Error handling chatMessage:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    const roomMap = usersInRoom.get(room);
    if (roomMap) {
      roomMap.delete(socket.id);
      if (roomMap.size === 0) {
        usersInRoom.delete(room);
      } else {
        broadcastRoomUsers(room);
      }
    }
  });
});

// start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
