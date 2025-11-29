// backend/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

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

    // simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "INVALID EMAIL FORMAT" });
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

    // generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // create user
    await User.create({
      username,
      email,
      passwordHash,
      isVerified: false,
      verificationToken,
      verificationExpires,
    });

    // build verification URL
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    // send verification email
    const html = `
      <h1>Verify your TerminalBoard account</h1>
      <p>Hi ${username},</p>
      <p>Thanks for registering. Please confirm your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>This link expires in 24 hours.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Verify your TerminalBoard account",
      html,
    });

    res.status(201).json({
      message: "SIGNUP SUCCESS. CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "SERVER ERROR DURING SIGNUP" });
  }
});

/**
 * GET /api/auth/verify-email?token=...
 */
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("<h1>Invalid verification link</h1>");
    }

    // find matching user with valid token
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res
        .status(400)
        .send("<h1>Verification link is invalid or has expired.</h1>");
    }

    // mark verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return res.send(`
      <h1>Email verified ✅</h1>
      <p>Your TerminalBoard account is now verified.</p>
      <p>You may close this tab and log in from the app.</p>
    `);
  } catch (err) {
    console.error("Verify email error:", err);
    return res
      .status(500)
      .send("<h1>Server error during email verification.</h1>");
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
      return res.status(400).json({ message: "CREDENTIALS REQUIRED" });
    }

    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });

    if (!user) {
      return res.status(401).json({ message: "INVALID CREDENTIALS" });
    }

    // BLOCK LOGIN until email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "EMAIL NOT VERIFIED. CHECK YOUR INBOX.",
      });
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
