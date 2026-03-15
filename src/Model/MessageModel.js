const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
  {
    type:      { type: String, enum: ["image", "video", "document"], required: true },
    url:       { type: String, required: true },  // Cloudinary secure_url
    name:      { type: String, required: true },  // original filename
    sizeLabel: { type: String },                  // e.g. "2.4 MB"
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    senderId:    { type: mongoose.Schema.Types.ObjectId, ref: "user_collection", required: true },
    receiverId:  { type: mongoose.Schema.Types.ObjectId, ref: "user_collection", required: true },
    text:        { type: String, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;