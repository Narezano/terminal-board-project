// backend/routes/authRoutes.js
// Auth routes for TerminalBoard:
// - POST /api/auth/signup  -> create a new user account
// - POST /api/auth/login   -> authenticate user and issue JWT
//
// Notes:
// - Passwords are stored as bcrypt hashes (passwordHash).
// - JWT includes { id, username, role } so the frontend + admin routes can enforce permissions.
// - Token expires in 7 days.

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/**
 * Create a signed JWT for the client to store (tb_token).
 * Payload contains:
 * - id: Mongo user id
 * - username: for convenience
 * - role: "user" | "admin" (used by admin middleware)
 */
function createToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * POST /api/auth/signup
 * Creates a user account.
 *
 * Body:
 * - username (string)
 * - email (string)
 * - password (string)
 *
 * Returns:
 * - user object (safe fields only)
 * - token (JWT)
 */
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic input validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "USERNAME, EMAIL, AND PASSWORD REQUIRED",
      });
    }

    // Minimal password policy (kept simple for this project)
    if (password.length < 6) {
      return res.status(400).json({
        message: "PASSWORD MUST BE AT LEAST 6 CHARACTERS",
      });
    }

    // Prevent duplicates by either email OR username
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "USERNAME OR EMAIL ALREADY IN USE",
      });
    }

    // Hash password before storing (never store plaintext)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (role defaults in the User model)
    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    // Issue token so user is logged in immediately after signup
    const token = createToken(user);

    res.status(201).json({
      message: "SIGNUP SUCCESS",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        // NOTE: If you want the frontend to know role immediately, add:
        // role: user.role,
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
 * Authenticates a user and returns a JWT.
 *
 * Body:
 * - usernameOrEmail (string)
 * - password (string)
 *
 * Returns:
 * - user object (safe fields only)
 * - token (JWT)
 */
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    // Basic input validation
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "CREDENTIALS REQUIRED" });
    }

    // Find by either email or username ("handle")
    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });

    // Avoid leaking which field failed; keep message generic
    if (!user) {
      return res.status(401).json({ message: "INVALID CREDENTIALS" });
    }

    // Compare submitted password against stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "INVALID CREDENTIALS" });
    }

    // Issue a fresh token (includes current role)
    const token = createToken(user);

    res.json({
      message: "LOGIN SUCCESS",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        // NOTE: If you want the frontend to know role immediately, add:
        // role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "SERVER ERROR DURING LOGIN" });
  }
});

module.exports = router;
