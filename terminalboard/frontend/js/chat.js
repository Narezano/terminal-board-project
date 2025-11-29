const $ = (sel) => document.querySelector(sel);

const CHAT_USERS = [
  { handle: "anon42", status: "online", meta: "sysop" },
  { handle: "dialup", status: "online", meta: "nostalgia" },
  { handle: "ghost", status: "away", meta: "brb" },
  { handle: "rackrat", status: "online", meta: "homelab" },
  { handle: "palette", status: "online", meta: "art mode" },
];

let CHAT_MESSAGES = [
  {
    id: 1,
    type: "system",
    author: "SYSTEM",
    text: "Welcome to /lobby/ — Matrix Lounge. This is a frontend-only demo.",
    time: "23:41",
  },
  {
    id: 2,
    type: "user",
    author: "anon42",
    text: "Feels like signing into an AOL room in 2004.",
    time: "23:42",
  },
  {
    id: 3,
    type: "user",
    author: "dialup",
    text: "Matrix rain + old UI = peak internet vibes.",
    time: "23:42",
  },
  {
    id: 4,
    type: "user",
    author: "ghost",
    text: "Backend and real-time will come later once APIs are wired.",
    time: "23:43",
  },
];

function renderUsers() {
  const list = $("#chatUserList");
  if (!list) return;

  list.innerHTML = "";

  CHAT_USERS.forEach((u) => {
    const li = document.createElement("li");
    li.className = "user-list__item";

    const dot = document.createElement("span");
    dot.className = "user-status-dot";
    if (u.status === "away") dot.classList.add("user-status-dot--away");
    if (u.status === "offline") dot.classList.add("user-status-dot--offline");

    const handle = document.createElement("span");
    handle.className = "user-handle";
    handle.textContent = u.handle;

    const meta = document.createElement("span");
    meta.className = "user-meta";
    meta.textContent = u.meta;

    li.appendChild(dot);
    li.appendChild(handle);
    li.appendChild(meta);
    list.appendChild(li);
  });
}

function renderMessages() {
  const container = $("#chatMessages");
  if (!container) return;

  container.innerHTML = "";

  CHAT_MESSAGES.forEach((msg) => {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";

    if (msg.type === "self") wrapper.classList.add("chat-message--self");
    if (msg.type === "system") wrapper.classList.add("chat-message--system");

    wrapper.innerHTML = `
      <div class="chat-message__meta">
        <span class="chat-message__author">${msg.author}</span>
        <span class="chat-message__time">[${msg.time}]</span>
      </div>
      <div class="chat-message__text">${msg.text}</div>
    `;

    container.appendChild(wrapper);
  });

  container.scrollTop = container.scrollHeight;
}

function getCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = $("#chatInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  CHAT_MESSAGES.push({
    id: CHAT_MESSAGES.length + 1,
    type: "self",
    author: "you",
    text,
    time: getCurrentTime(),
  });

  input.value = "";
  renderMessages();
}

function initChat() {
  const form = $("#chatForm");
  const input = $("#chatInput");

  if (!form || !input) return;

  renderUsers();
  renderMessages();

  form.addEventListener("submit", handleChatSubmit);
}

document.addEventListener("DOMContentLoaded", initChat);
