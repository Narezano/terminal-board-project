// frontend/js/admin.js
// Minimal admin dashboard logic:
// - Verifies admin via GET /api/admin/me
// - Lists recent messages in a room
// - Allows deletion by message ID
// - Lists users + allows changing role

(() => {
  const $ = (sel) => document.querySelector(sel);

  /**
   * Same local detection logic as main.js.
   * Important for Live Server using 127.0.0.1.
   */
  const IS_LOCAL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE_URL = IS_LOCAL
    ? "http://localhost:5000"
    : "https://terminalboard-backend.onrender.com";

  /**
   * Read JWT token from localStorage.
   * If it doesn't exist, admin routes will 401.
   */
  function getToken() {
    try {
      return localStorage.getItem("tb_token");
    } catch {
      return null;
    }
  }

  function setNote(msg, isError = false) {
    const el = $("#adminNote");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "var(--error)" : "var(--muted)";
  }

  /**
   * Wrapper around fetch:
   * - Attaches Authorization: Bearer <token>
   * - Parses JSON (best-effort)
   * - Throws readable errors for non-OK responses
   */
  async function api(path, opts = {}) {
    const token = getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  /**
   * Server-side admin check.
   * - 200 -> admin, stay on page
   * - 401/403 -> not allowed, redirect to chat
   */
  async function checkAdmin() {
    try {
      const me = await api("/api/admin/me");
      $("#adminWhoami").textContent = `${me.username} (${me.role})`;
      return true;
    } catch (err) {
      $("#adminWhoami").textContent = "not admin";
      setNote(err.message || "Not authorized", true);

      // Keep UX simple: bounce non-admins back to chat.
      setTimeout(() => {
        window.location.href = "chat.html";
      }, 700);

      return false;
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMessages(messages) {
    const wrap = $("#messagesList");
    wrap.innerHTML = "";

    if (!messages || messages.length === 0) {
      wrap.innerHTML = `<div class="admin-note">No messages found.</div>`;
      return;
    }

    for (const m of messages) {
      const created = m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
      const meta = `${m.room || ""} · ${m.type || "text"} · ${created}`;

      // Display GIF messages as a link line; text messages as text.
      const text =
        m.type === "gif" && m.mediaUrl ? `[GIF] ${m.mediaUrl}` : m.text || "";

      const row = document.createElement("div");
      row.className = "admin-grid msg-row";
      row.innerHTML = `
        <div><span class="pill">${escapeHtml(m.author || "unknown")}</span></div>
        <div class="msg-text">${escapeHtml(text)}</div>
        <div style="color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .06em;">
          ${escapeHtml(meta)}
          <div style="margin-top:4px; opacity:.9;">id: ${escapeHtml(m._id || "")}</div>
        </div>
        <div>
          <button class="mini-btn danger" data-del="${escapeHtml(m._id)}">Delete</button>
        </div>
      `;

      wrap.appendChild(row);
    }

    // Attach delete handlers after rendering
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!id) return;

        if (!confirm("Delete this message?")) return;

        try {
          await api(`/api/admin/messages/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          setNote("Deleted message.");
          btn.closest(".msg-row")?.remove();
        } catch (err) {
          setNote(err.message || "Delete failed", true);
        }
      });
    });
  }

  function renderUsers(users) {
    const wrap = $("#usersList");
    wrap.innerHTML = "";

    if (!users || users.length === 0) {
      wrap.innerHTML = `<div class="admin-note">No users found.</div>`;
      return;
    }

    for (const u of users) {
      const created = u.createdAt ? new Date(u.createdAt).toLocaleString() : "";

      const card = document.createElement("div");
      card.style.border = "1px solid rgba(0,255,0,.2)";
      card.style.padding = "10px";
      card.style.marginBottom = "8px";

      card.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
          <div>
            <div><span class="pill">${escapeHtml(u.username)}</span></div>
            <div style="color:var(--muted); font-size:10px; margin-top:4px; text-transform:uppercase; letter-spacing:.06em;">
              ${escapeHtml(u.email || "")}
              <div>created: ${escapeHtml(created)}</div>
              <div>role: <strong>${escapeHtml(u.role || "user")}</strong></div>
            </div>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <select data-role="${escapeHtml(u._id)}" class="admin-input" style="min-width:140px;">
              <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            </select>
            <button class="mini-btn" data-save-role="${escapeHtml(u._id)}">Save</button>
          </div>
        </div>
      `;

      wrap.appendChild(card);
    }

    // Attach role update handlers
    wrap.querySelectorAll("[data-save-role]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-save-role");
        if (!id) return;

        const sel = wrap.querySelector(`select[data-role="${CSS.escape(id)}"]`);
        const role = sel?.value;

        try {
          await api(`/api/admin/users/${encodeURIComponent(id)}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role }),
          });
          setNote(`Updated role to ${role}.`);
        } catch (err) {
          setNote(err.message || "Role update failed", true);
        }
      });
    });
  }

  async function loadMessages() {
    const room = ($("#roomInput").value || "lobby").trim();

    try {
      setNote("Loading messages…");
      const data = await api(
        `/api/admin/messages?room=${encodeURIComponent(room)}&limit=80`
      );
      renderMessages(data.messages || []);
      setNote(`Loaded messages for room: ${room}`);
    } catch (err) {
      setNote(err.message || "Failed to load messages", true);
    }
  }

  async function loadUsers() {
    try {
      setNote("Loading users…");
      const data = await api(`/api/admin/users?limit=80`);
      renderUsers(data.users || []);
      setNote("Loaded users.");
    } catch (err) {
      setNote(err.message || "Failed to load users", true);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Default view: lobby messages
    $("#roomInput").value = "lobby";

    // Enforce admin-only access
    const ok = await checkAdmin();
    if (!ok) return;

    // Wire buttons
    $("#btnRefresh").addEventListener("click", loadMessages);
    $("#btnLoadUsers").addEventListener("click", loadUsers);

    // Auto-load messages on page open
    loadMessages();
  });
})();
