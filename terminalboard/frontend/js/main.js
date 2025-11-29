// frontend/js/main.js

// Helper to get elements
const $ = (sel) => document.querySelector(sel);

// Decide which API to call: local dev or deployed backend
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://terminalboard-backend.onrender.com";

// Helper to show messages
function setMessage(el, text, type = "info") {
  if (!el) return;
  el.textContent = text;
  el.className = `message message--${type}`;
}

/* ========== LOGIN (REAL BACKEND) ========== */
async function login(event) {
  if (event) event.preventDefault();

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(msg, data.message || "LOGIN FAILED", "error");
      return;
    }

    // Store token + user for later (boards, chat, etc.)
    if (data.token) {
      localStorage.setItem("tb_token", data.token);
    }
    if (data.user) {
      localStorage.setItem("tb_user", JSON.stringify(data.user));
    }

    setMessage(msg, "ACCESS GRANTED. REDIRECTING...", "success");

    // Redirect to boards page from login (root index.html)
    setTimeout(() => {
      window.location.href = "frontend/boards.html";
    }, 800);
  } catch (err) {
    console.error("Login error:", err);
    setMessage(msg, "NETWORK ERROR. TRY AGAIN.", "error");
  }
}

const loginForm = $("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", login);
}

/* ========== SIGNUP (REAL BACKEND) ========== */
async function signup(event) {
  if (event) event.preventDefault();

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(msg, data.message || "SIGNUP FAILED", "error");
      return;
    }

    setMessage(msg, "SIGNUP SUCCESS. REDIRECTING TO SIGN IN...", "success");

    // After signup, send them back to login page
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1200);
  } catch (err) {
    console.error("Signup error:", err);
    setMessage(msg, "NETWORK ERROR. TRY AGAIN.", "error");
  }
}

const signupForm = $("#signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", signup);
}
