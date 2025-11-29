const $ = (sel) => document.querySelector(sel);

const BOARDS = [
  {
    id: "b",
    code: "/b/",
    name: "Random",
    desc: "Anything goes. Expect chaos.",
  },
  {
    id: "tech",
    code: "/tech/",
    name: "Technology",
    desc: "Hardware, software, hacking, and code dumps.",
  },
  {
    id: "art",
    code: "/art/",
    name: "Art & Design",
    desc: "Pixel art, posters, UI mockups, album covers.",
  },
  {
    id: "retro",
    code: "/retro/",
    name: "Retro & Nostalgia",
    desc: "Old web, CRTs, floppy drives, lost media.",
  },
];

const THREADS = [
  {
    id: 1,
    boardId: "b",
    title: "Post your cursed desktop screenshots",
    author: "anon42",
    replies: 68,
    updated: "1 min ago",
    preview: "OP here. I still run XP on my main machine, AMA...",
  },
  {
    id: 2,
    boardId: "b",
    title: "Late night ramble thread",
    author: "ghost",
    replies: 23,
    updated: "12 mins ago",
    preview: "You ever open an old save file and it feels like time travel?",
  },
  {
    id: 3,
    boardId: "tech",
    title: "Show your homelab setups",
    author: "rackrat",
    replies: 54,
    updated: "5 mins ago",
    preview: "Nothing fancy, just a ThinkPad tower and a mess of cables.",
  },
  {
    id: 4,
    boardId: "tech",
    title: "Best lightweight Linux for old laptops?",
    author: "kernelpanic",
    replies: 31,
    updated: "27 mins ago",
    preview: "Need something that still feels like 2010 Ubuntu...",
  },
  {
    id: 5,
    boardId: "art",
    title: "Crit my vaporwave poster",
    author: "palette",
    replies: 17,
    updated: "8 mins ago",
    preview:
      "Trying to mix CRT scanlines with neon kanji. Thoughts on the type?",
  },
  {
    id: 6,
    boardId: "retro",
    title: "Drop your favorite early 2010s sites",
    author: "dialup",
    replies: 40,
    updated: "2 hrs ago",
    preview: "Looking for weird flash game portals and dead forums.",
  },
];

function renderBoards(boardListEl, activeBoardId) {
  boardListEl.innerHTML = "";

  BOARDS.forEach((board) => {
    const li = document.createElement("li");
    li.className =
      "board-item" + (board.id === activeBoardId ? " board-item--active" : "");
    li.dataset.boardId = board.id;

    li.innerHTML = `
      <div class="board-item__row">
        <span class="board-item__code">${board.code}</span>
        <span class="board-item__name">${board.name}</span>
      </div>
      <span class="board-item__desc">${board.desc}</span>
    `;

    boardListEl.appendChild(li);
  });
}

function renderThreads(threadListEl, boardId) {
  const threadsForBoard = THREADS.filter((t) => t.boardId === boardId);

  threadListEl.innerHTML = "";

  if (!threadsForBoard.length) {
    threadListEl.innerHTML =
      '<div class="thread-card"><div class="thread-card__preview">No threads yet. Be the first to post when backend is live.</div></div>';
    return;
  }

  threadsForBoard.forEach((thread) => {
    const div = document.createElement("div");
    div.className = "thread-card";
    div.innerHTML = `
      <div class="thread-card__header">
        <span class="thread-card__title">${thread.title}</span>
        <span class="thread-card__meta">by ${thread.author}</span>
        <span class="badge">${thread.replies} REPLIES</span>
      </div>
      <div class="thread-card__meta">Last update: ${thread.updated}</div>
      <div class="thread-card__preview">${thread.preview}</div>
    `;
    threadListEl.appendChild(div);
  });
}

function initBoardsPage() {
  const boardListEl = $("#boardList");
  const threadListEl = $("#threadList");
  const titleEl = $("#currentBoardTitle");
  const descEl = $("#currentBoardDesc");

  if (!boardListEl || !threadListEl || !titleEl || !descEl) return;

  let activeBoardId = "b";

  function setActiveBoard(boardId) {
    const board = BOARDS.find((b) => b.id === boardId) || BOARDS[0];
    activeBoardId = board.id;

    renderBoards(boardListEl, activeBoardId);
    renderThreads(threadListEl, activeBoardId);

    titleEl.textContent = `${board.code} — ${board.name}`;
    descEl.textContent = board.desc;
  }

  setActiveBoard(activeBoardId);

  boardListEl.addEventListener("click", (e) => {
    const li = e.target.closest(".board-item");
    if (!li) return;
    const id = li.dataset.boardId;
    if (!id || id === activeBoardId) return;
    setActiveBoard(id);
  });
}

document.addEventListener("DOMContentLoaded", initBoardsPage);
