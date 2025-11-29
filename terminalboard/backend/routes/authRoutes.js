// backend/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Helper: sign JWT
function createToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * POST /api/auth/signup
 * body: { username, email, password }
 */
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // basic validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "USERNAME, EMAIL, AND PASSWORD REQUIRED" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "PASSWORD MUST BE AT LEAST 6 CHARACTERS" });
    }

    // check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "USERNAME OR EMAIL ALREADY IN USE" });
    }

    // hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    const token = createToken(user);

    res.status(201).json({
      message: "SIGNUP SUCCESS",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "SERVER ERROR DURING SIGNUP" });
  }
});

/**
 * POST /api/auth/login
 * body: { usernameOrEmail, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ message: "CREDENTIALS REQUIRED" });
    }

    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });

    if (!user) {
      return res.status(401).json({ message: "INVALID CREDENTIALS" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "INVALID CREDENTIALS" });
    }

    const token = createToken(user);

    res.json({
      message: "LOGIN SUCCESS",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "SERVER ERROR DURING LOGIN" });
  }
});

module.exports = router;
