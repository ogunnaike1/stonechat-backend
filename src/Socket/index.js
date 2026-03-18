const { Server } = require("socket.io");
const User    = require("../Model/UserModel");
const Message = require("../Model/MessageModel");

module.exports = (server) => {
  const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://stonechat.vercel.app",
      process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // ── REGISTER USER ──────────────────────────────────────────────────────────
    socket.on("register_user", async (userId) => {
      if (!userId) return;
      await User.findByIdAndUpdate(userId, { socketId: socket.id });
      console.log("✅ User registered:", userId);
    });

    // ── SEND MESSAGE ───────────────────────────────────────────────────────────
    socket.on("send_message", async ({ senderId, receiverId, text, messageId, attachments = [] }) => {
      if (!senderId || !receiverId) return;
      if (!text && attachments.length === 0) return;

      const message = await Message.create({
        senderId,
        receiverId,
        text: text || "",
        attachments,
      });

      const payload = {
        from:        senderId,
        to:          receiverId,
        text:        text || "",
        messageId,
        attachments,
        createdAt:   message.createdAt,
      };

      const receiver = await User.findById(receiverId);
      if (receiver?.socketId) {
        io.to(receiver.socketId).emit("receive_message", payload);
      }
    });

    // ── DELETE MESSAGE FOR EVERYONE ────────────────────────────────────────────
    // Frontend emits: socket.emit("delete_message_for_everyone", { messageId, receiverId })
    socket.on("delete_message_for_everyone", async ({ messageId, receiverId }) => {
      if (!messageId || !receiverId) return;

      const receiver = await User.findById(receiverId);
      if (receiver?.socketId) {
        io.to(receiver.socketId).emit("message_deleted_for_everyone", { messageId });
      }
    });

    // ── SEND FRIEND REQUEST ────────────────────────────────────────────────────
    socket.on("send_friend_request", async ({ fromId, toId }) => {
      if (!fromId || !toId) return;

      const sender   = await User.findById(fromId).select("username profilePicture");
      if (!sender) return;

      const receiver = await User.findById(toId);
      if (!receiver?.socketId) return;

      io.to(receiver.socketId).emit("friend_request_received", {
        fromId,
        fromName:   sender.username,
        fromAvatar: sender.profilePicture || null,
      });
    });

    // ── ACCEPT FRIEND REQUEST ──────────────────────────────────────────────────
    socket.on("accept_friend_request", async ({ fromId, toId }) => {
      if (!fromId || !toId) return;

      const accepter = await User.findById(toId).select("username profilePicture");
      if (!accepter) return;

      const originalSender = await User.findById(fromId);
      if (!originalSender?.socketId) return;

      io.to(originalSender.socketId).emit("friend_request_accepted", {
        byId:     toId,
        byName:   accepter.username,
        byAvatar: accepter.profilePicture || null,
      });
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
      console.log("🔴 Disconnected:", socket.id);
    });
  });
};