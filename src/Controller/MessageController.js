const Message    = require("../Model/MessageModel");
const cloudinary = require("../Utils/Cloudinary");
const streamifier = require("streamifier");

/* ─────────────────────────────────────────────
   UPLOAD FILE → CLOUDINARY
   POST /messages/upload
   Body: multipart/form-data  { file, type }
   type: "image" | "video" | "document"
───────────────────────────────────────────── */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided", status: false });
    }

    const fileType = req.body.type || "document";

    // Map our type to Cloudinary's resource_type
    // "image" → "image", "video" → "video", "document" → "raw"
    const resourceType =
      fileType === "image" ? "image" :
      fileType === "video" ? "video" :
      "raw"; // raw = any file Cloudinary stores without transforming (PDFs, docs, etc.)

    // Stream the buffer directly to Cloudinary — no temp file needed
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: "stonechat_files",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      // Pipe the file buffer into the Cloudinary upload stream
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    return res.status(200).json({
      url:          uploadResult.secure_url,
      publicId:     uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      format:       uploadResult.format,
      status:       true,
    });
  } catch (error) {
    console.error("uploadFile error:", error);
    return res.status(500).json({ message: "Upload failed", status: false });
  }
};

/* ─────────────────────────────────────────────
   GET ALL MESSAGES BETWEEN TWO USERS
   GET /messages/all/:userId
───────────────────────────────────────────── */
const getAllMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
      ],
    }).sort({ createdAt: 1 }); // oldest first

    return res.status(200).json(messages);
  } catch (error) {
    console.error("getAllMessages error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   CLEAR CHAT BETWEEN TWO USERS
   DELETE /messages/clear/:userId/:friendId
───────────────────────────────────────────── */
const clearChat = async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    await Message.deleteMany({
      $or: [
        { senderId: userId,   receiverId: friendId },
        { senderId: friendId, receiverId: userId   },
      ],
    });

    return res.status(200).json({ message: "Chat cleared", status: true });
  } catch (error) {
    console.error("clearChat error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { uploadFile, getAllMessages, clearChat };