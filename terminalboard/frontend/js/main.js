// Simple helper
const $ = (sel) => document.querySelector(sel);

/* ========== LOGIN DEMO ========== */
function login(event) {
  if (event) event.preventDefault();

  const username = $("#loginUsername")?.value.trim();
  const password = $("#loginPassword")?.value.trim();
  const msg = $("#loginMessage");

  if (!msg) return;

  if (!username || !password) {
    msg.textContent = "ENTER HANDLE AND PASSPHRASE";
    msg.className = "message message--error";
    return;
  }

  msg.textContent = "DEMO ONLY — BACKEND AUTH NOT WIRED YET.";
  msg.className = "message message--success";
}

const loginForm = $("#loginForm");
if (loginForm) loginForm.addEventListener("submit", login);

/* ========== SIGNUP DEMO ========== */
function signup(event) {
  if (event) event.preventDefault();

  const username = $("#signupUsername")?.value.trim();
  const email = $("#signupEmail")?.value.trim();
  const password = $("#signupPassword")?.value;
  const confirm = $("#signupConfirmPassword")?.value;
  const tosChecked = $("#signupTos")?.checked;
  const msg = $("#signupMessage");

  if (!msg) return;

  if (!username || !email || !password || !confirm) {
    msg.textContent = "FILL ALL FIELDS";
    msg.className = "message message--error";
    return;
  }

  if (password !== confirm) {
    msg.textContent = "PASS PHRASES DO NOT MATCH";
    msg.className = "message message--error";
    return;
  }

  if (!tosChecked) {
    msg.textContent = "YOU MUST ACCEPT THE RULES";
    msg.className = "message message--error";
    return;
  }

  msg.textContent =
    "SIGNUP DEMO COMPLETE. REAL ACCOUNT CREATION WILL USE THE SERVER LATER.";
  msg.className = "message message--success";
}

const signupForm = $("#signupForm");
if (signupForm) signupForm.addEventListener("submit", signup);
