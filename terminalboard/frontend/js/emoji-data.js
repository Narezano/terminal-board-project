// frontend/js/emoji-data.js
// =========================================================
// TerminalBoard — Local Emoji Dataset
//
// chat.js expects this global:
//   window.TB_EMOJIS = [ { e, n, k, c }, ... ]
//
// Field meanings:
//   e = emoji character
//   n = readable name (used for tooltip + search)
//   k = keywords array (used for search)
//   c = category name (used for tabs/categories)
// =========================================================

window.TB_EMOJIS = [
  // -------------------------
  // Smileys
  // -------------------------
  { e: "😀", n: "grinning face", k: ["smile", "happy", "grin"], c: "Smileys" },
  { e: "😁", n: "beaming face", k: ["smile", "happy", "teeth"], c: "Smileys" },
  { e: "😂", n: "face with tears of joy", k: ["lol", "funny", "laugh"], c: "Smileys" },
  { e: "🤣", n: "rolling on the floor laughing", k: ["rofl", "lol", "laugh"], c: "Smileys" },
  { e: "🥹", n: "face holding back tears", k: ["tears", "proud", "emotional"], c: "Smileys" },
  { e: "😊", n: "smiling face", k: ["smile", "warm", "happy"], c: "Smileys" },
  { e: "😍", n: "smiling face with heart-eyes", k: ["love", "heart", "crush"], c: "Smileys" },
  { e: "😘", n: "face blowing a kiss", k: ["kiss", "love"], c: "Smileys" },
  { e: "😎", n: "smiling face with sunglasses", k: ["cool", "swag"], c: "Smileys" },
  { e: "🤔", n: "thinking face", k: ["think", "hmm", "question"], c: "Smileys" },
  { e: "😴", n: "sleeping face", k: ["sleep", "tired", "zzz"], c: "Smileys" },
  { e: "😭", n: "loudly crying face", k: ["cry", "sad", "tears"], c: "Smileys" },
  { e: "😡", n: "pouting face", k: ["angry", "mad"], c: "Smileys" },
  { e: "😈", n: "smiling face with horns", k: ["devil", "mischief"], c: "Smileys" },
  { e: "💀", n: "skull", k: ["dead", "rip", "lmao"], c: "Smileys" },

  // -------------------------
  // People
  // -------------------------
  { e: "🙏", n: "folded hands", k: ["please", "pray", "thanks"], c: "People" },
  { e: "👍", n: "thumbs up", k: ["ok", "yes", "like"], c: "People" },
  { e: "👎", n: "thumbs down", k: ["no", "dislike"], c: "People" },
  { e: "👏", n: "clapping hands", k: ["clap", "applause"], c: "People" },
  { e: "🫶", n: "heart hands", k: ["love", "heart"], c: "People" },
  { e: "💪", n: "flexed biceps", k: ["strong", "gym"], c: "People" },
  { e: "👀", n: "eyes", k: ["look", "see", "watch"], c: "People" },
  { e: "🫡", n: "saluting face", k: ["salute", "respect"], c: "People" },
  { e: "🤝", n: "handshake", k: ["deal", "agree"], c: "People" },
  { e: "🧠", n: "brain", k: ["smart", "think"], c: "People" },
  { e: "🧍", n: "person standing", k: ["person"], c: "People" },
  { e: "🧑‍💻", n: "technologist", k: ["dev", "coding", "computer"], c: "People" },

  // -------------------------
  // Animals
  // -------------------------
  { e: "🐶", n: "dog face", k: ["dog", "pet"], c: "Animals" },
  { e: "🐱", n: "cat face", k: ["cat", "pet"], c: "Animals" },
  { e: "🐸", n: "frog", k: ["frog"], c: "Animals" },
  { e: "🐵", n: "monkey face", k: ["monkey"], c: "Animals" },
  { e: "🦊", n: "fox", k: ["fox"], c: "Animals" },
  { e: "🐼", n: "panda", k: ["panda"], c: "Animals" },
  { e: "🐧", n: "penguin", k: ["penguin"], c: "Animals" },
  { e: "🦄", n: "unicorn", k: ["unicorn"], c: "Animals" },

  // -------------------------
  // Food
  // -------------------------
  { e: "🍕", n: "pizza", k: ["pizza", "food"], c: "Food" },
  { e: "🍔", n: "burger", k: ["burger", "food"], c: "Food" },
  { e: "🍟", n: "fries", k: ["fries"], c: "Food" },
  { e: "🍣", n: "sushi", k: ["sushi"], c: "Food" },
  { e: "🍜", n: "noodles", k: ["ramen", "noodles"], c: "Food" },
  { e: "☕", n: "hot beverage", k: ["coffee", "tea"], c: "Food" },

  // -------------------------
  // Activities
  // -------------------------
  { e: "🎮", n: "video game", k: ["game", "gaming"], c: "Activities" },
  { e: "🎧", n: "headphone", k: ["music", "listen"], c: "Activities" },
  { e: "🎬", n: "clapper board", k: ["movie", "film"], c: "Activities" },
  { e: "⚽", n: "soccer ball", k: ["sports"], c: "Activities" },

  // -------------------------
  // Travel
  // -------------------------
  { e: "🚗", n: "car", k: ["car", "drive"], c: "Travel" },
  { e: "✈️", n: "airplane", k: ["plane", "travel"], c: "Travel" },
  { e: "🗺️", n: "map", k: ["map", "travel"], c: "Travel" },
  { e: "🏙️", n: "city", k: ["city"], c: "Travel" },

  // -------------------------
  // Objects
  // -------------------------
  { e: "📌", n: "pushpin", k: ["pin"], c: "Objects" },
  { e: "📷", n: "camera", k: ["photo"], c: "Objects" },
  { e: "💻", n: "laptop", k: ["computer"], c: "Objects" },
  { e: "📎", n: "paperclip", k: ["clip"], c: "Objects" },

  // -------------------------
  // Symbols
  // -------------------------
  { e: "✅", n: "check mark button", k: ["check", "yes"], c: "Symbols" },
  { e: "❌", n: "cross mark", k: ["no", "x"], c: "Symbols" },
  { e: "🔥", n: "fire", k: ["fire", "lit"], c: "Symbols" },
  { e: "✨", n: "sparkles", k: ["sparkle", "magic"], c: "Symbols" },
  { e: "💯", n: "hundred points", k: ["100", "perfect"], c: "Symbols" },
  { e: "🟢", n: "green circle", k: ["online", "green"], c: "Symbols" },
  { e: "⚠️", n: "warning", k: ["warn", "alert"], c: "Symbols" },
];
