// frontend/js/main.js
// Handles login + signup for TerminalBoard (index.html + signup page)
// Stores auth session in localStorage:
// - tb_token: JWT token
// - tb_user:  user object (username/email/role)

const $ = (sel) => document.querySelector(sel);

/**
 * Detect local dev environments.
 * Note: Live Server often uses 127.0.0.1, so we treat both as "local".
 */
const IS_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

/**
 * Backend base URL:
 * - Local: Node/Express on port 5000
 * - Deployed: Render backend
 */
const API_BASE_URL = IS_LOCAL
  ? "http://localhost:5000"
  : "https://terminalboard-backend.onrender.com";

/**
 * Utility: Render a UI message (success/error/info)
 * Assumes your CSS defines: .message.message--info, --success, --error
 */
function setMessage(el, text, type = "info") {
  if (!el) return;
  el.textContent = text;
  el.className = `message message--${type}`;
}

/* ===========================
   LOGIN (REAL BACKEND)
   =========================== */
async function login(event) {
  event?.preventDefault();

  const usernameOrEmail = $("#loginUsername")?.value.trim();
  const password = $("#loginPassword")?.value.trim();
  const msg = $("#loginMessage");

  if (!usernameOrEmail || !password) {
    setMessage(msg, "ENTER HANDLE AND PASSPHRASE", "error");
    return;
  }

  try {
    setMessage(msg, "CHECKING CREDENTIALS...", "info");

    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(msg, data.message || "LOGIN FAILED", "error");
      return;
    }

    // Persist session for pages like chat/admin
    if (data.token) localStorage.setItem("tb_token", data.token);
    if (data.user) localStorage.setItem("tb_user", JSON.stringify(data.user));

    setMessage(msg, "ACCESS GRANTED. REDIRECTING...", "success");

    // index.html lives in project root, chat is under /frontend
    setTimeout(() => {
      window.location.href = "frontend/chat.html";
    }, 800);
  } catch (err) {
    console.error("Login error:", err);
    setMessage(msg, "NETWORK ERROR. TRY AGAIN.", "error");
  }
}

$("#loginForm")?.addEventListener("submit", login);

/* ===========================
   SIGNUP (REAL BACKEND)
   =========================== */
async function signup(event) {
  event?.preventDefault();

  const username = $("#signupUsername")?.value.trim();
  const email = $("#signupEmail")?.value.trim();
  const password = $("#signupPassword")?.value;
  const confirm = $("#signupConfirmPassword")?.value;
  const tosChecked = $("#signupTos")?.checked;
  const msg = $("#signupMessage");

  if (!username || !email || !password || !confirm) {
    setMessage(msg, "ALL FIELDS REQUIRED", "error");
    return;
  }

  if (password.length < 6) {
    setMessage(msg, "PASSPHRASE MUST BE AT LEAST 6 CHARACTERS", "error");
    return;
  }

  if (password !== confirm) {
    setMessage(msg, "PASSPHRASES DO NOT MATCH", "error");
    return;
  }

  if (!tosChecked) {
    setMessage(msg, "YOU MUST ACCEPT THE RULES", "error");
    return;
  }

  try {
    setMessage(msg, "CREATING ACCOUNT...", "info");

    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(msg, data.message || "SIGNUP FAILED", "error");
      return;
    }

    setMessage(msg, "SIGNUP SUCCESS. REDIRECTING TO SIGN IN...", "success");

    // signup page is under /frontend, login is root index.html
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1200);
  } catch (err) {
    console.error("Signup error:", err);
    setMessage(msg, "NETWORK ERROR. TRY AGAIN.", "error");
  }
}

$("#signupForm")?.addEventListener("submit", signup);
