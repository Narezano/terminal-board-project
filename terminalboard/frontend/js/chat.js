// frontend/js/chat.js

const $ = (sel) => document.querySelector(sel);

// ✅ FIX: treat localhost AND 127.0.0.1 as "local"
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const CHAT_API_BASE_URL = isLocal
  ? "http://localhost:5000"
  : "https://terminalboard-backend.onrender.com";

const ROOM = "lobby";
const MAX_LEN = 240;

// grouping window: 2 minutes
const GROUP_WINDOW_MS = 2 * 60 * 1000;

// typing: debounce and timeout
const TYPING_EMIT_DEBOUNCE_MS = 400;
const TYPING_CLEAR_AFTER_MS = 1500;

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

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(ts) {
  const time = ts ? new Date(ts) : new Date();
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Create message element.
 * opts.grouped = true => hide meta (grouping)
 * msg.type === "system" => system styling
 */
function createMessageElement(msg, currentUsername, opts = {}) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  const authorName = msg.author || "anon";
  if (currentUsername && authorName === currentUsername) {
    div.classList.add("chat-message--self");
  }

  if (opts.grouped) {
    div.classList.add("chat-message--grouped");
  }

  if (msg.type === "system") {
    div.classList.add("chat-message--system");
  }

  const timeStr = formatTime(msg.createdAt);

  div.dataset.author = authorName;
  div.dataset.ts = msg.createdAt
    ? String(new Date(msg.createdAt).getTime())
    : String(Date.now());

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

function renderUsersSidebar(currentUser, onlineUsers) {
  const list = $("#chatUsersList") || document.querySelector(".user-list");
  if (!list) return;

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

async function fetchHistory(currentUsername) {
  const messagesContainer = $("#chatMessages");
  if (!messagesContainer) return;

  try {
    const res = await fetch(
      `${CHAT_API_BASE_URL}/api/chat/messages?room=${ROOM}`
    );
    if (!res.ok) {
      console.error("Failed to load messages:", res.status);
      return;
    }

    const data = await res.json();
    const messages = data.messages || [];

    messagesContainer.innerHTML = "";

    let prev = null;
    for (const m of messages) {
      const grouped = shouldGroupWithPrev(prev, m);
      messagesContainer.appendChild(
        createMessageElement(m, currentUsername, { grouped })
      );
      prev = m;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (err) {
    console.error("Error fetching chat history:", err);
  }
}

/** Decide if message m should be grouped with previous message prev */
function shouldGroupWithPrev(prev, m) {
  if (!prev || !m) return false;
  if (prev.type === "system" || m.type === "system") return false;

  const prevAuthor = prev.author || "anon";
  const mAuthor = m.author || "anon";
  if (prevAuthor !== mAuthor) return false;

  const prevTs = prev.createdAt ? new Date(prev.createdAt).getTime() : null;
  const mTs = m.createdAt ? new Date(m.createdAt).getTime() : null;
  if (!prevTs || !mTs) return false;

  return mTs - prevTs <= GROUP_WINDOW_MS;
}

/** Grouping, but for DOM elements (real-time messages) */
function shouldGroupWithPrevEl(prevEl, msg) {
  if (!prevEl || !msg) return false;
  if (msg.type === "system") return false;

  const prevAuthor = prevEl.dataset.author || "";
  const mAuthor = msg.author || "anon";
  if (prevAuthor !== mAuthor) return false;

  const prevTs = Number(prevEl.dataset.ts || "0");
  const mTs = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();

  if (!prevTs) return false;
  return mTs - prevTs <= GROUP_WINDOW_MS;
}

/** Dynamically load socket.io client */
function loadSocketIo(socketBase) {
  return new Promise((resolve, reject) => {
    if (window.io) return resolve();

    const script = document.createElement("script");
    script.src = `${socketBase}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load socket.io client script"));
    document.head.appendChild(script);
  });
}

function setConnStatus(state) {
  const el = $("#chatConnStatus");
  if (!el) return;

  el.classList.remove(
    "chat-conn--online",
    "chat-conn--offline",
    "chat-conn--reconnecting"
  );

  if (state === "online") {
    el.textContent = "ONLINE";
    el.classList.add("chat-conn--online");
  } else if (state === "reconnecting") {
    el.textContent = "RECONNECTING";
    el.classList.add("chat-conn--reconnecting");
  } else {
    el.textContent = "OFFLINE";
    el.classList.add("chat-conn--offline");
  }
}

/** Append message with grouping support */
function appendMessage(messagesContainer, msg, currentUsername) {
  const lastEl = messagesContainer.lastElementChild;
  const grouped = shouldGroupWithPrevEl(lastEl, msg);
  const el = createMessageElement(msg, currentUsername, { grouped });
  messagesContainer.appendChild(el);
  return el;
}

/** Append a system message (client-side) */
function pushSystem(messagesContainer, text, currentUsername) {
  appendMessage(
    messagesContainer,
    {
      type: "system",
      author: "system",
      text,
      createdAt: new Date().toISOString(),
    },
    currentUsername
  );
}

/** typing indicator manager */
function createTypingManager(currentUsername) {
  const typingEl = $("#chatTyping");
  const typingUsers = new Map(); // username -> timeoutId

  function render() {
    if (!typingEl) return;

    const names = [...typingUsers.keys()].filter(
      (n) => n && n !== currentUsername
    );
    if (names.length === 0) {
      typingEl.textContent = "";
      return;
    }

    if (names.length === 1) {
      typingEl.textContent = `${names[0]} is typing…`;
      return;
    }

    const shown = names.slice(0, 2);
    const rest = names.length - shown.length;
    typingEl.textContent =
      rest > 0
        ? `${shown.join(", ")} +${rest} are typing…`
        : `${shown.join(" and ")} are typing…`;
  }

  function mark(username) {
    if (!username || username === currentUsername) return;

    if (typingUsers.has(username)) {
      clearTimeout(typingUsers.get(username));
    }

    const tid = setTimeout(() => {
      typingUsers.delete(username);
      render();
    }, TYPING_CLEAR_AFTER_MS);

    typingUsers.set(username, tid);
    render();
  }

  function clearAll() {
    for (const tid of typingUsers.values()) clearTimeout(tid);
    typingUsers.clear();
    render();
  }

  return { mark, clearAll };
}

function initChat() {
  const form = $("#chatForm");
  const input = $("#chatInput");
  const messagesContainer = $("#chatMessages");
  const newMsgBtn = $("#chatNewMsgBtn");
  const charCount = $("#chatCharCount");
  const sendBtn = form?.querySelector('button[type="submit"]');

  if (!form || !input || !messagesContainer) {
    console.error("Chat form or messages container not found in DOM");
    return;
  }

  const user = getCurrentUser();
  const username = user?.username || "anon";

  // input limits + counter
  input.maxLength = MAX_LEN;
  const updateCount = () => {
    if (charCount) charCount.textContent = `${input.value.length}/${MAX_LEN}`;
  };
  input.addEventListener("input", updateCount);
  updateCount();

  renderUsersSidebar(user, [username]);
  fetchHistory(username);

  // scroll behavior
  let shouldAutoScroll = true;
  const atBottom = () => {
    const slack = 24;
    return (
      messagesContainer.scrollTop + messagesContainer.clientHeight >=
      messagesContainer.scrollHeight - slack
    );
  };

  messagesContainer.addEventListener("scroll", () => {
    shouldAutoScroll = atBottom();
    if (newMsgBtn && shouldAutoScroll) newMsgBtn.hidden = true;
  });

  if (newMsgBtn) {
    newMsgBtn.addEventListener("click", () => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      newMsgBtn.hidden = true;
      shouldAutoScroll = true;
    });
  }

  // ✅ FIX: use isLocal here too
  const socketBase = isLocal
    ? "http://localhost:5000"
    : "https://terminalboard-backend.onrender.com";

  setConnStatus("offline");
  if (sendBtn) sendBtn.disabled = true;

  // system join/leave via roomUsers diff
  let prevUserSet = new Set([username]);

  const typingMgr = createTypingManager(username);

  // typing emit debounce
  let lastTypingEmit = 0;
  let typingEmitTimer = null;

  function emitTyping(socket) {
    if (!socket?.connected) return;

    const now = Date.now();
    if (now - lastTypingEmit < TYPING_EMIT_DEBOUNCE_MS) return;
    lastTypingEmit = now;

    socket.emit("typing", { room: ROOM, username });
  }

  loadSocketIo(socketBase)
    .then(() => {
      const socket = io(socketBase, {
        query: { username },
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      socket.on("connect", () => {
        setConnStatus("online");
        if (sendBtn) sendBtn.disabled = false;

        pushSystem(messagesContainer, `${username} connected.`, username);

        if (shouldAutoScroll)
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });

      socket.on("disconnect", () => {
        setConnStatus("offline");
        if (sendBtn) sendBtn.disabled = true;
        typingMgr.clearAll();
      });

      socket.io.on("reconnect_attempt", () => {
        setConnStatus("reconnecting");
        if (sendBtn) sendBtn.disabled = true;
      });

      socket.on("roomUsers", (payload) => {
        const { users } = payload || {};
        renderUsersSidebar(user, users);

        const nextSet = new Set((users || []).filter(Boolean));

        for (const u of nextSet) {
          if (!prevUserSet.has(u)) {
            pushSystem(messagesContainer, `${u} joined /${ROOM}/`, username);
          }
        }

        for (const u of prevUserSet) {
          if (!nextSet.has(u)) {
            pushSystem(messagesContainer, `${u} left /${ROOM}/`, username);
          }
        }

        prevUserSet = nextSet;

        if (shouldAutoScroll)
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        else if (newMsgBtn) newMsgBtn.hidden = false;
      });

      socket.on("chatMessage", (msg) => {
        appendMessage(messagesContainer, msg, username);

        if (shouldAutoScroll) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else if (newMsgBtn) {
          newMsgBtn.hidden = false;
        }
      });

      // typing receive
      socket.on("typing", (payload) => {
        const who = payload?.username;
        typingMgr.mark(who);
      });

      // Enter to send, Shift+Enter for newline
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) return;
        if (e.key === "Enter") {
          e.preventDefault();
          form.requestSubmit();
        }
      });

      // typing emit while input changes
      input.addEventListener("input", () => {
        if (typingEmitTimer) clearTimeout(typingEmitTimer);
        typingEmitTimer = setTimeout(() => emitTyping(socket), 0);
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const text = input.value.trim();
        if (!text) return;
        if (!socket.connected) return;

        socket.emit("chatMessage", { author: username, text });

        input.value = "";
        updateCount();
        input.focus();
      });
    })
    .catch((err) => {
      console.error(err);
      setConnStatus("offline");
    });
}

document.addEventListener("DOMContentLoaded", initChat);
