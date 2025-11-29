// frontend/js/chat.js

// Small helper
const $ = (sel) => document.querySelector(sel);

// Backend base URL (local vs deployed)
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

// Very small XSS safety for text content
function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Render one message
function createMessageElement(msg, currentUsername) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  const authorName = msg.author || "anon";
  if (currentUsername && authorName === currentUsername) {
    div.classList.add("chat-message--self");
  }

  const time = msg.createdAt ? new Date(msg.createdAt) : new Date();
  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <div class="chat-message__meta">
      <span class="chat-message__author">${escapeHtml(authorName)}</span>
      <span class="chat-message__time">${timeStr}</span>
    </div>
    <div class="chat-message__text">
      ${escapeHtml(msg.text || "")}
    </div>
  `;

  return div;
}

// Render active users in sidebar
function renderUsersSidebar(currentUser, onlineUsers) {
  const list =
    $("#chatUsersList") || document.querySelector(".user-list");

  if (!list) {
    console.warn("No user list element found (#chatUsersList or .user-list)");
    return;
  }

  list.innerHTML = "";

  const currentName = currentUser?.username || "anon";

  const usersToRender =
    Array.isArray(onlineUsers) && onlineUsers.length
      ? onlineUsers
      : [currentName];

  usersToRender.forEach((name) => {
    const li = document.createElement("li");
    li.classList.add("user-list__item");

    const isMe = name === currentName;

    li.innerHTML = `
      <span class="user-status-dot"></span>
      <span class="user-handle">${escapeHtml(name)}</span>
      ${
        isMe
          ? '<span class="user-meta">you</span>'
          : '<span class="user-meta">online</span>'
      }
    `;

    list.appendChild(li);
  });
}

// Load last messages from REST API
async function fetchHistory(currentUsername) {
  const messagesContainer = $("#chatMessages");
  if (!messagesContainer) {
    console.warn("#chatMessages not found in DOM");
    return;
  }

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
      const el = createMessageElement(m, currentUsername);
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

  if (!form || !input || !messagesContainer) {
    console.error("Chat form or messages container not found in DOM");
    return;
  }

  const user = getCurrentUser();

  if (!user) {
    console.warn("No logged in user found in localStorage (tb_user). Using 'anon'.");
  }

  const username = user?.username || "anon";

  // Initial sidebar render (in case socket event is slow)
  renderUsersSidebar(user, [username]);

  // Fetch existing messages
  fetchHistory(username);

  // Socket.io connection
  const socketBase =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://terminalboard-backend.onrender.com";

  console.log("Connecting to socket.io at:", socketBase);

  const socket = io(socketBase, {
    query: {
      username,
    },
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  // Active users list
  socket.on("roomUsers", (payload) => {
    console.log("roomUsers event:", payload);
    const { users } = payload || {};
    renderUsersSidebar(user, users);
  });

  // Listen for incoming messages
  socket.on("chatMessage", (msg) => {
    const el = createMessageElement(msg, username);
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Handle sending messages
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socket.emit("chatMessage", {
      author: username,
      text,
    });

    input.value = "";
    input.focus();
  });
}

document.addEventListener("DOMContentLoaded", initChat);
