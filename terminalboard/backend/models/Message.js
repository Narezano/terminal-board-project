// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      maxlength: 32,
    },

    // message type: text | gif
    type: {
      type: String,
      enum: ["text", "gif"],
      default: "text",
    },

    // text is optional IF a gif exists
    text: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // for gif messages (stores final url)
    mediaUrl: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    room: {
      type: String,
      default: "lobby",
    },
  },
  { timestamps: true }
);

// Basic validation: must have text or mediaUrl
messageSchema.pre("validate", function (next) {
  const hasText = typeof this.text === "string" && this.text.trim().length > 0;
  const hasMedia =
    typeof this.mediaUrl === "string" && this.mediaUrl.trim().length > 0;

  if (!hasText && !hasMedia) {
    return next(new Error("Message must include text or mediaUrl"));
  }
  next();
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
