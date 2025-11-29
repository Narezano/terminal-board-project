// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

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

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
