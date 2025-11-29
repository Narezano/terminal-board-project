// frontend/js/chat.js

// Small helper
const $ = (sel) => document.querySelector(sel);

// Use same backend switching logic as main.js
const CHAT_API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://terminalboard-backend.onrender.com";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("tb_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading tb_user from localStorage:", err);
    return null;
  }
}

// Render one message
function createMessageElement(msg) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  // basic retro style: author + time + text
  const time = msg.createdAt ? new Date(msg.createdAt) : new Date();
  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <div class="chat-message__meta">
      <span class="chat-message__author">${msg.author || "anon"}</span>
      <span class="chat-message__time">${timeStr}</span>
    </div>
    <div class="chat-message__text">
      ${escapeHtml(msg.text || "")}
    </div>
  `;

  return div;
}

// Very small XSS safety for text content
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderUsersSidebar(currentUser) {
  const list = $("#chatUsersList");
  if (!list) return;

  // For now just show the current user as "online"
  list.innerHTML = "";

  const me = document.createElement("li");
  me.classList.add("chat-user");
  me.innerHTML = `
    <span class="chat-user__handle">${currentUser?.username || "anon"}</span>
    <span class="chat-user__status chat-user__status--online">online</span>
    <span class="chat-user__meta">you</span>
  `;
  list.appendChild(me);
}

async function fetchHistory() {
  const messagesContainer = $("#chatMessages");
  if (!messagesContainer) return;

  try {
    const res = await fetch(`${CHAT_API_BASE_URL}/api/chat/messages?room=lobby`);
    if (!res.ok) {
      console.error("Failed to load messages:", res.status);
      return;
    }

    const data = await res.json();
    const messages = data.messages || [];

    messagesContainer.innerHTML = "";
    messages.forEach((m) => {
      const el = createMessageElement(m);
      messagesContainer.appendChild(el);
    });

    // scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (err) {
    console.error("Error fetching chat history:", err);
  }
}

function initChat() {
  const form = $("#chatForm");
  const input = $("#chatInput");
  const messagesContainer = $("#chatMessages");

  if (!form || !input || !messagesContainer) return;

  const user = getCurrentUser();

  // If no user, you can choose to redirect to login
  if (!user) {
    // Simple behavior: treat as anon, or:
    // window.location.href = "../index.html";
    console.warn("No logged in user found, using 'anon'");
  }

  renderUsersSidebar(user);

  // Fetch existing messages first
  fetchHistory();

  // Socket.io connection
  const socketBase =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://terminalboard-backend.onrender.com";

  const socket = io(socketBase);

  // Listen for incoming messages
  socket.on("chatMessage", (msg) => {
    const el = createMessageElement(msg);
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Handle sending messages
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const author = user?.username || "anon";

    socket.emit("chatMessage", {
      author,
      text,
    });

    input.value = "";
    input.focus();
  });
}

document.addEventListener("DOMContentLoaded", initChat);
