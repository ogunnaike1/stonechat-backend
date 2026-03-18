const express     = require("express");
const router      = express.Router();
const Message     = require("../Model/MessageModel");
const verifyToken = require("../middleware/authMiddleware");
const upload      = require("../utils/MutlerConfig");
const cloudinary  = require("../utils/Cloudinary");
const streamifier = require("streamifier");

/* ─────────────────────────────────────────────
   UPLOAD FILE → CLOUDINARY
   POST /messages/upload
───────────────────────────────────────────── */
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided", status: false });
    }

    const fileType = req.body.type || "document";
    const resourceType =
      fileType === "image" ? "image" :
      fileType === "video" ? "video" :
      "raw";

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: "stonechat_files", use_filename: true, unique_filename: true },
        (error, result) => { if (error) return reject(error); resolve(result); }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    return res.status(200).json({ url: uploadResult.secure_url, status: true });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Upload failed", status: false });
  }
});

/* ─────────────────────────────────────────────
   ALL USER MESSAGES
   GET /messages/all/:userId
───────────────────────────────────────────── */
router.get("/all/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   SINGLE CONVERSATION
   GET /messages/:userId/:otherUserId
───────────────────────────────────────────── */
router.get("/:userId/:otherUserId", verifyToken, async (req, res) => {
  const { userId, otherUserId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId,      receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId      },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   DELETE SINGLE MESSAGE (for everyone)
   DELETE /messages/:messageId
───────────────────────────────────────────── */
router.delete("/:messageId", verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    await Message.findByIdAndDelete(messageId);
    res.status(200).json({ message: "Message deleted", status: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   CLEAR CHAT
   DELETE /messages/clear/:userId/:otherUserId
───────────────────────────────────────────── */
router.delete("/clear/:userId/:otherUserId", verifyToken, async (req, res) => {
  const { userId, otherUserId } = req.params;
  try {
    await Message.deleteMany({
      $or: [
        { senderId: userId,      receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId      },
      ],
    });
    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;