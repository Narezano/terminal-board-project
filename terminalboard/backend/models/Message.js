// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      maxlength: 32,
    },
    text: {
      type: String,
      required: true,
      maxlength: 500,
    },
    room: {
      type: String,
      default: "lobby", // single room for now
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;