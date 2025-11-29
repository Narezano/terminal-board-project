// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io instance
const io = new Server(server, {
  cors: {
    origin: "*", // dev-friendly; later lock to your Vercel URL
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

// --- Socket.io chat logic (one room: /lobby/) ---
const Message = require("./models/Message");

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const room = "lobby";
  socket.join(room);

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
  });
});

// start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
