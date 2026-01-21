// frontend/js/chat.js
// =========================================================
// TerminalBoard — Chatroom (Frontend)
// What this file does:
// - Loads chat history from backend (REST)
// - Connects to Socket.IO (real-time messages + typing)
// - Handles room switching
// - Handles emoji/GIF picker + pending GIF queue
//
// IMPORTANT: This refactor keeps the same behavior.
// Only structure, naming, and comments were improved.
// =========================================================

/* =========================================================
   0) Tiny helpers + environment config
========================================================= */

const $ = (sel) => document.querySelector(sel);

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const CHAT_API_BASE_URL = isLocal
  ? "http://localhost:5000"
  : "https://terminalboard-backend.onrender.com";

const SOCKET_BASE_URL = CHAT_API_BASE_URL;

// Chat basics
let currentRoom = "lobby";
const MAX_LEN = 240;

// Message grouping + typing indicator timers
const GROUP_WINDOW_MS = 2 * 60 * 1000;
const TYPING_EMIT_DEBOUNCE_MS = 400;
const TYPING_CLEAR_AFTER_MS = 1500;

/* =========================================================
   1) Pending GIF queue (selected GIFs before sending)
========================================================= */

const MAX_PENDING_GIFS = 6;
let pendingGifs = []; // [{ url, previewUrl, title }]

function getPendingMediaEl() {
  return $("#pendingMedia");
}

function renderPendingMedia() {
  const wrap = getPendingMediaEl();
  if (!wrap) return;

  // If nothing is queued, hide the whole bar.
  if (!pendingGifs.length) {
    wrap.hidden = true;
    wrap.innerHTML = "";
    return;
  }

  wrap.hidden = false;
  wrap.innerHTML = "";

  pendingGifs.forEach((g, idx) => {
    const item = document.createElement("div");
    item.className = "pending-media__item";

    const img = document.createElement("img");
    img.className = "pending-media__thumb";
    img.src = g.previewUrl || g.url;
    img.alt = g.title || "gif";
    img.loading = "lazy";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pending-media__remove";
    btn.textContent = "×";
    btn.title = "Remove";
    btn.addEventListener("click", () => removePendingGifAt(idx));

    item.appendChild(img);
    item.appendChild(btn);
    wrap.appendChild(item);
  });
}

function addPendingGif(item) {
  if (!item?.url) return;

  // Prevent duplicates (same URL)
  if (pendingGifs.some((g) => g.url === item.url)) return;

  // Simple hard cap (quietly ignores extras, same as original)
  if (pendingGifs.length >= MAX_PENDING_GIFS) return;

  pendingGifs.push({
    url: item.url,
    previewUrl: item.previewUrl || item.url,
    title: item.title || "gif",
  });

  renderPendingMedia();
}

function removePendingGifAt(idx) {
  if (idx < 0 || idx >= pendingGifs.length) return;
  pendingGifs.splice(idx, 1);
  renderPendingMedia();
}

function clearPendingGifs() {
  pendingGifs = [];
  renderPendingMedia();
}

/* =========================================================
   2) User + formatting helpers
========================================================= */

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

/** Simple HTML escape for safe rendering (prevents basic injection). */
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

/** Renders either plain text or a GIF <img> depending on message type. */
function renderMessageBody(msg) {
  if (msg?.type === "gif" && msg?.mediaUrl) {
    const url = escapeHtml(msg.mediaUrl);
    return `<img class="chat-media" src="${url}" alt="gif" loading="lazy" />`;
  }
  return escapeHtml(msg?.text || "");
}

/* =========================================================
   3) Message DOM creation + grouping logic
========================================================= */

function createMessageElement(msg, currentUsername, opts = {}) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  const authorName = msg.author || "anon";

  // Right-align your own messages
  if (currentUsername && authorName === currentUsername) {
    div.classList.add("chat-message--self");
  }

  // Grouped messages hide the meta line (CSS does the hiding)
  if (opts.grouped) div.classList.add("chat-message--grouped");

  // System messages get special styling
  if (msg.type === "system") div.classList.add("chat-message--system");

  const timeStr = formatTime(msg.createdAt);

  // Store some info on the element so we can group future messages properly
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
      ${
        msg.type === "system"
          ? escapeHtml(msg.text || "")
          : renderMessageBody(msg)
      }
    </div>
  `;

  return div;
}

/**
 * Checks grouping against history messages (raw objects).
 * Used when rendering the initial history list.
 */
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

/**
 * Checks grouping against the last already-rendered DOM element.
 * Used for live incoming messages (Socket.IO).
 */
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

function appendMessage(messagesContainer, msg, currentUsername) {
  const lastEl = messagesContainer.lastElementChild;
  const grouped = shouldGroupWithPrevEl(lastEl, msg);

  const el = createMessageElement(msg, currentUsername, { grouped });
  messagesContainer.appendChild(el);
  return el;
}

function pushSystem(messagesContainer, text, currentUsername) {
  appendMessage(
    messagesContainer,
    { type: "system", author: "system", text, createdAt: new Date().toISOString() },
    currentUsername
  );
}

/* =========================================================
   4) Sidebar users list
========================================================= */

function renderUsersSidebar(currentUser, onlineUsers) {
  const list = $("#chatUsersList") || document.querySelector(".user-list");
  if (!list) return;

  list.innerHTML = "";

  const currentName = currentUser?.username || "anon";

  // If server doesn't send users, still render "you" as a fallback.
  const usersToRender =
    Array.isArray(onlineUsers) && onlineUsers.length ? onlineUsers : [currentName];

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

/* =========================================================
   5) History fetch (REST)
========================================================= */

async function fetchHistory(currentUsername) {
  const messagesContainer = $("#chatMessages");
  if (!messagesContainer) return false;

  try {
    const res = await fetch(
      `${CHAT_API_BASE_URL}/api/chat/messages?room=${encodeURIComponent(currentRoom)}`
    );
    if (!res.ok) return false;

    const data = await res.json();
    const messages = data.messages || [];

    messagesContainer.innerHTML = "";

    // Apply grouping rules while rendering history
    let prev = null;
    for (const m of messages) {
      const grouped = shouldGroupWithPrev(prev, m);
      messagesContainer.appendChild(
        createMessageElement(m, currentUsername, { grouped })
      );
      prev = m;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return true;
  } catch (err) {
    console.error("Error fetching chat history:", err);
    return false;
  }
}

/* =========================================================
   6) Socket.IO loader + connection status badge
========================================================= */

/**
 * Loads the Socket.IO client script from the server if it isn't already present.
 * (This keeps your deployment flexible: local vs Render.)
 */
function loadSocketIo(socketBase) {
  return new Promise((resolve, reject) => {
    if (window.io) return resolve();

    const script = document.createElement("script");
    script.src = `${socketBase}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load socket.io client script"));
    document.head.appendChild(script);
  });
}

function setConnStatus(state) {
  const el = $("#chatConnStatus");
  if (!el) return;

  el.classList.remove("chat-conn--online", "chat-conn--offline", "chat-conn--reconnecting");

  if (state === "online") {
    el.textContent = "ONLINE";
    el.classList.add("chat-conn--online");
    return;
  }

  if (state === "reconnecting") {
    el.textContent = "RECONNECTING";
    el.classList.add("chat-conn--reconnecting");
    return;
  }

  // default = offline
  el.textContent = "OFFLINE";
  el.classList.add("chat-conn--offline");
}

/* =========================================================
   7) Typing indicator manager
========================================================= */

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

    // Reset the timer if they keep typing
    if (typingUsers.has(username)) clearTimeout(typingUsers.get(username));

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

/* =========================================================
   8) Room header title
========================================================= */

function setRoomTitle(room) {
  const titleEl = document.querySelector(".chat-room-name");
  if (!titleEl) return;
  titleEl.textContent = `ROOM: /${room}/ — TerminalBoard`;
}

/* =========================================================
   9) Picker (Emoji + GIF)
========================================================= */

function setPickerTab(mode) {
  const tabEmoji = $("#tabEmoji");
  const tabGif = $("#tabGif");
  const emojiGrid = $("#emojiGrid");
  const gifGrid = $("#gifGrid");
  const cats = $("#emojiCats");

  if (!tabEmoji || !tabGif || !emojiGrid || !gifGrid) return;

  if (mode === "gif") {
    tabEmoji.classList.remove("picker__tab--active");
    tabGif.classList.add("picker__tab--active");

    emojiGrid.hidden = true;
    gifGrid.hidden = false;
    if (cats) cats.hidden = true;
    return;
  }

  // default = emoji
  tabGif.classList.remove("picker__tab--active");
  tabEmoji.classList.add("picker__tab--active");

  gifGrid.hidden = true;
  emojiGrid.hidden = false;
  if (cats) cats.hidden = false;
}

function openPicker(mode = "emoji") {
  const picker = $("#picker");
  if (!picker) return;

  picker.hidden = false;
  setPickerTab(mode);

  const search = $("#pickerSearch");
  if (search) {
    search.value = "";
    search.focus();
  }

  // Same initial content behavior as before
  if (mode === "gif") searchGifs("funny");
  else renderEmojiGrid("");
}

function closePicker() {
  const picker = $("#picker");
  if (!picker) return;
  picker.hidden = true;
}

/* =========================================================
   10) Emoji (local dataset)
   Requires: window.TB_EMOJIS (emoji-data.js)
========================================================= */

const EMOJI_STORE_KEY = "tb_recent_emojis";
const DEFAULT_EMOJI_CAT = "Smileys";
let activeEmojiCategory = DEFAULT_EMOJI_CAT;

function getEmojiDataset() {
  const ds = window.TB_EMOJIS;
  return Array.isArray(ds) ? ds : [];
}

function getRecentEmojis() {
  try {
    const raw = localStorage.getItem(EMOJI_STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecentEmoji(emoji) {
  const recent = getRecentEmojis().filter((x) => x !== emoji);
  recent.unshift(emoji);
  localStorage.setItem(EMOJI_STORE_KEY, JSON.stringify(recent.slice(0, 24)));
}

function matchesEmojiQuery(item, q) {
  if (!q) return true;

  const query = q.toLowerCase();

  // Match name
  if ((item.n || "").toLowerCase().includes(query)) return true;

  // Match keyword list
  const keys = Array.isArray(item.k) ? item.k : [];
  return keys.some((kw) => String(kw).toLowerCase().includes(query));
}

function getEmojiListForView(q) {
  const ds = getEmojiDataset();
  const query = (q || "").trim();

  // "Recent" is a special virtual category built from localStorage
  if (activeEmojiCategory === "Recent") {
    const recent = getRecentEmojis();
    const recentItems = recent
      .map(
        (e) =>
          ds.find((x) => x.e === e) || { e, n: "recent", k: [], c: "Recent" }
      )
      .filter((x) => matchesEmojiQuery(x, query));

    return recentItems;
  }

  return ds.filter(
    (x) => x.c === activeEmojiCategory && matchesEmojiQuery(x, query)
  );
}

function insertEmojiIntoInput(emoji) {
  const input = $("#chatInput");
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;

  // Reuse the existing input handler chain (counter, typing emit, etc.)
  input.dispatchEvent(new Event("input"));

  pushRecentEmoji(emoji);
}

function buildEmojiCategories() {
  const wrap = $("#emojiCats");
  if (!wrap) return;

  const icons = {
    Recent: "🕘",
    Smileys: "🙂",
    People: "🧍",
    Animals: "🐾",
    Food: "🍕",
    Activities: "🎮",
    Travel: "✈️",
    Objects: "💻",
    Symbols: "✨",
  };

  const categories = [
    "Recent",
    "Smileys",
    "People",
    "Animals",
    "Food",
    "Activities",
    "Travel",
    "Objects",
    "Symbols",
  ];

  wrap.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "picker__catbtn" + (cat === activeEmojiCategory ? " picker__catbtn--active" : "");
    btn.textContent = `${icons[cat] || "•"} ${cat}`;

    btn.addEventListener("click", () => {
      activeEmojiCategory = cat;

      // Update active state visually
      wrap
        .querySelectorAll(".picker__catbtn")
        .forEach((b) => b.classList.remove("picker__catbtn--active"));
      btn.classList.add("picker__catbtn--active");

      // Re-render using whatever is currently typed in search
      const q = ($("#pickerSearch")?.value || "").trim();
      renderEmojiGrid(q);
    });

    wrap.appendChild(btn);
  });
}

function renderEmojiGrid(filter = "") {
  const grid = $("#emojiGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = getEmojiListForView(filter);
  const q = (filter || "").trim();
  const ds = getEmojiDataset();

  // If searching within a category yields nothing, broaden to ALL emojis.
  const finalList =
    q && list.length === 0
      ? ds.filter((x) => matchesEmojiQuery(x, q)).slice(0, 120)
      : list;

  finalList.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker__emoji";
    btn.textContent = item.e;
    btn.title = item.n || "";

    btn.addEventListener("click", () => insertEmojiIntoInput(item.e));
    grid.appendChild(btn);
  });
}

/* =========================================================
   11) GIF search (backend REST)
========================================================= */

async function searchGifs(query) {
  const err = $("#gifError");
  const grid = $("#gifGrid");
  if (!grid) return;

  grid.innerHTML = "";
  if (err) err.textContent = "";

  try {
    const r = await fetch(
      `${CHAT_API_BASE_URL}/api/gifs/search?q=${encodeURIComponent(query)}&limit=36`
    );

    if (!r.ok) {
      if (err) err.textContent = "GIF search failed. Try again.";
      return;
    }

    const json = await r.json();
    const items = json.results || [];

    if (!items.length) {
      if (err) err.textContent = "No GIFs found.";
      return;
    }

    items.forEach((it) => {
      const img = document.createElement("img");
      img.className = "picker__gif";
      img.src = it.previewUrl || it.url;
      img.alt = it.title || "gif";
      img.loading = "lazy";
      img.title = "Click to add";

      img.addEventListener("click", () => {
        // Queue instead of overwriting (existing behavior)
        addPendingGif({
          url: it.url || it.previewUrl || "",
          previewUrl: it.previewUrl || it.url || "",
          title: it.title || "gif",
        });

        $("#chatInput")?.focus();
      });

      grid.appendChild(img);
    });
  } catch (e) {
    console.error(e);
    if (err) err.textContent = "GIF search error.";
  }
}

/* =========================================================
   12) Main init (wires up everything)
========================================================= */

function initChat() {
  // Core DOM elements
  const form = $("#chatForm");
  const input = $("#chatInput");
  const messagesContainer = $("#chatMessages");
  const newMsgBtn = $("#chatNewMsgBtn");
  const charCount = $("#chatCharCount");
  const sendBtn = form?.querySelector('button[type="submit"]');

  if (!form || !input || !messagesContainer) return;

  // Current user identity (stored on login)
  const user = getCurrentUser();
  const username = user?.username || "anon";

  // Initial UI renders
  renderPendingMedia();
  buildEmojiCategories();
  renderEmojiGrid("");

  // -------------------------------------------------------
  // Picker wiring (open/close + tabs + search)
  // -------------------------------------------------------
  const emojiBtn = $("#emojiBtn");
  const gifBtn = $("#gifBtn");
  const pickerClose = $("#pickerClose");
  const tabEmoji = $("#tabEmoji");
  const tabGif = $("#tabGif");
  const pickerSearch = $("#pickerSearch");

  emojiBtn?.addEventListener("click", () => openPicker("emoji"));
  gifBtn?.addEventListener("click", () => openPicker("gif"));
  pickerClose?.addEventListener("click", closePicker);

  tabEmoji?.addEventListener("click", () => {
    setPickerTab("emoji");
    const q = (pickerSearch?.value || "").trim();
    renderEmojiGrid(q);
  });

  tabGif?.addEventListener("click", () => {
    setPickerTab("gif");
    const q = (pickerSearch?.value || "").trim();
    searchGifs(q || "funny");
  });

  // Enter triggers search (emoji search just filters locally)
  pickerSearch?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = (pickerSearch.value || "").trim();

      const gifGrid = $("#gifGrid");
      const isGifTab = gifGrid && !gifGrid.hidden;

      if (isGifTab) searchGifs(q || "funny");
      else renderEmojiGrid(q);
    }

    if (e.key === "Escape") closePicker();
  });

  // Escape closes picker anywhere on the page
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePicker();
  });

  // -------------------------------------------------------
  // Input limits + live counter
  // -------------------------------------------------------
  input.maxLength = MAX_LEN;

  const updateCount = () => {
    if (charCount) charCount.textContent = `${input.value.length}/${MAX_LEN}`;
  };

  input.addEventListener("input", updateCount);
  updateCount();

  // -------------------------------------------------------
  // Basic initial render
  // -------------------------------------------------------
  renderUsersSidebar(user, [username]);
  setRoomTitle(currentRoom);
  fetchHistory(username);

  // -------------------------------------------------------
  // Scroll behavior (auto-scroll unless user scrolls up)
  // -------------------------------------------------------
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

  newMsgBtn?.addEventListener("click", () => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    newMsgBtn.hidden = true;
    shouldAutoScroll = true;
  });

  // -------------------------------------------------------
  // Socket.IO connection setup
  // -------------------------------------------------------
  setConnStatus("offline");
  if (sendBtn) sendBtn.disabled = true;

  let prevUserSet = new Set([username]);
  const typingMgr = createTypingManager(username);

  // Typing emit debounce state
  let lastTypingEmit = 0;
  let typingEmitTimer = null;

  function emitTyping(socket) {
    if (!socket?.connected) return;

    const now = Date.now();
    if (now - lastTypingEmit < TYPING_EMIT_DEBOUNCE_MS) return;
    lastTypingEmit = now;

    socket.emit("typing", { room: currentRoom, username });
  }

  loadSocketIo(SOCKET_BASE_URL)
    .then(() => {
      const socket = io(SOCKET_BASE_URL, {
        query: { username },
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      // ---------------------------
      // Connection events
      // ---------------------------
      socket.on("connect", () => {
        setConnStatus("online");
        if (sendBtn) sendBtn.disabled = false;

        socket.emit("joinRoom", { room: currentRoom, username });
        pushSystem(messagesContainer, `${username} connected.`, username);

        if (shouldAutoScroll) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });

      socket.on("disconnect", () => {
        setConnStatus("offline");
        if (sendBtn) sendBtn.disabled = true;

        typingMgr.clearAll();
        closePicker();

        // Clears queued GIFs on disconnect (keeps behavior identical)
        clearPendingGifs();
      });

      socket.io.on("reconnect_attempt", () => {
        setConnStatus("reconnecting");
        if (sendBtn) sendBtn.disabled = true;
      });

      // ---------------------------
      // Server tells us who is in the room
      // ---------------------------
      socket.on("roomUsers", (payload) => {
        const { room, users } = payload || {};
        if (room && room !== currentRoom) return;

        renderUsersSidebar(user, users);

        const nextSet = new Set((users || []).filter(Boolean));

        // Join/leave system messages
        for (const u of nextSet) {
          if (!prevUserSet.has(u)) {
            pushSystem(messagesContainer, `${u} joined /${currentRoom}/`, username);
          }
        }
        for (const u of prevUserSet) {
          if (!nextSet.has(u)) {
            pushSystem(messagesContainer, `${u} left /${currentRoom}/`, username);
          }
        }

        prevUserSet = nextSet;

        if (shouldAutoScroll) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        else if (newMsgBtn) newMsgBtn.hidden = false;
      });

      // ---------------------------
      // Incoming chat messages
      // ---------------------------
      socket.on("chatMessage", (msg) => {
        if (msg?.room && msg.room !== currentRoom) return;

        appendMessage(messagesContainer, msg, username);

        if (shouldAutoScroll) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        else if (newMsgBtn) newMsgBtn.hidden = false;
      });

      // ---------------------------
      // Typing signal
      // ---------------------------
      socket.on("typing", (payload) => typingMgr.mark(payload?.username));

      // ---------------------------
      // Input handling (Enter to send, Escape closes picker)
      // ---------------------------
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) return;

        if (e.key === "Enter") {
          e.preventDefault();
          form.requestSubmit();
        }

        if (e.key === "Escape") closePicker();
      });

      // Emit typing with a tiny debounce (same timing behavior)
      input.addEventListener("input", () => {
        if (typingEmitTimer) clearTimeout(typingEmitTimer);
        typingEmitTimer = setTimeout(() => emitTyping(socket), 0);
      });

      // ---------------------------
      // Room switching
      // ---------------------------
      document.querySelectorAll(".room-list__item").forEach((item) => {
        item.addEventListener("click", () => {
          const newRoom = item.dataset.room;

          if (!newRoom || newRoom === currentRoom) return;
          if (!socket.connected) return;

          closePicker();
          clearPendingGifs(); // No stale GIFs when switching rooms

          socket.emit("leaveRoom", { room: currentRoom });
          socket.emit("joinRoom", { room: newRoom, username });

          currentRoom = newRoom;
          setRoomTitle(currentRoom);

          // Reset room-related UI/state
          prevUserSet = new Set([username]);
          typingMgr.clearAll();
          messagesContainer.innerHTML = "";

          fetchHistory(username).then(() => {
            pushSystem(messagesContainer, `Joined /${currentRoom}/`, username);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          });

          // Update active room highlight
          document
            .querySelectorAll(".room-list__item")
            .forEach((el) => el.classList.remove("room-list__item--active"));
          item.classList.add("room-list__item--active");
        });
      });

      // ---------------------------
      // SEND: text + multiple queued GIFs
      // ---------------------------
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!socket.connected) return;

        const text = input.value.trim();
        const hasText = !!text;
        const hasGifs = pendingGifs.length > 0;

        // Nothing to send
        if (!hasText && !hasGifs) return;

        // 1) Send text first (if any)
        if (hasText) {
          socket.emit("chatMessage", {
            author: username,
            room: currentRoom,
            type: "text",
            text,
          });
        }

        // 2) Send all queued GIFs (each becomes its own message)
        if (hasGifs) {
          pendingGifs.forEach((g) => {
            socket.emit("chatMessage", {
              author: username,
              room: currentRoom,
              type: "gif",
              mediaUrl: g.url,
              text: "",
            });
          });
        }

        // Clear UI + state
        input.value = "";
        input.dispatchEvent(new Event("input")); // updates counter + typing emit chain
        clearPendingGifs();
        input.focus();
      });
    })
    .catch((err) => {
      console.error(err);
      setConnStatus("offline");
    });
}

document.addEventListener("DOMContentLoaded", initChat);
