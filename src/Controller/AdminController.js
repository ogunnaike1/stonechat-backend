const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const Admin    = require("../Model/AdminModel");
const User     = require("../Model/UserModel");
const Message  = require("../Model/MessageModel");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

/* ─────────────────────────────────────────────
   SEED FIRST ADMIN (run once via script or
   call POST /admin/seed in development)
───────────────────────────────────────────── */
const seedAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({ email: "admin@stonechat.com" });
    if (existing) return res.status(200).json({ message: "Admin already exists" });

    // ✅ your details
        const hashed = await bcrypt.hash("Us08123579895#", 10);
        await Admin.create({
        username: "yourusername",
        email:    "ogunnaikeusman17@gmail.com",
        password: hashed,
        role:     "superadmin",
        });

    res.status(201).json({ message: "Admin seeded. Change password immediately." });
  } catch (err) {
    res.status(500).json({ message: "Seed failed", error: err.message });
  }
};

/* ─────────────────────────────────────────────
   ADMIN LOGIN
───────────────────────────────────────────── */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required", status: false });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(401).json({ message: "Invalid credentials", status: false });

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials", status: false });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      status: true,
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   DASHBOARD STATS
───────────────────────────────────────────── */
const getDashboardStats = async (req, res) => {
  try {
    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalMessages,
      messagesToday,
      bannedUsers,
      reportedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ socketId: { $ne: null } }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ status: "banned" }),
      User.countDocuments({ reportCount: { $gt: 0 } }),
    ]);

    // Unique conversation pairs = distinct senderId+receiverId combos
    const convPairs = await Message.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ["$senderId", "$receiverId"] },
              { a: "$senderId", b: "$receiverId" },
              { a: "$receiverId", b: "$senderId" },
            ],
          },
        },
      },
      { $count: "total" },
    ]);
    const totalConversations = convPairs[0]?.total ?? 0;

    res.json({
      totalUsers,
      activeUsers,
      totalMessages,
      messagesToday,
      totalConversations,
      bannedUsers,
      reportedUsers,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   MESSAGES PER DAY (last 14 days)
───────────────────────────────────────────── */
const getMessagesPerDay = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const data = await Message.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data.map(d => ({ date: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   NEW USERS PER DAY (last 14 days)
───────────────────────────────────────────── */
const getNewUsersPerDay = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const data = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data.map(d => ({ date: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   PEAK CHAT HOURS (last 7 days)
───────────────────────────────────────────── */
const getPeakHours = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);

    const data = await Message.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 24 hours even if some have 0
    const hours = Array.from({ length: 24 }, (_, h) => {
      const found = data.find(d => d._id === h);
      return { hour: h, count: found?.count ?? 0 };
    });

    res.json(hours);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   USER LIST (paginated + filtered)
───────────────────────────────────────────── */
const getUsers = async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 20,
      search = "",
      status = "",
      sort   = "createdAt",
      order  = "desc",
    } = req.query;

    const query = {};
    if (search) query.username = { $regex: search, $options: "i" };
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("username email profilePicture status socketId createdAt reportCount friends")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enriched = users.map(u => ({
      _id:               u._id,
      username:          u.username,
      email:             u.email,
      profilePicture:    u.profilePicture,
      status:            u.status || "active",
      online:            !!u.socketId,
      joinedAt:          u.createdAt,
      reportCount:       u.reportCount || 0,
      friendCount:       u.friends?.length ?? 0,
    }));

    res.json({ users: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   USER ACTIONS
───────────────────────────────────────────── */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // "active" | "suspended" | "banned"

    const valid = ["active", "suspended", "banned"];
    if (!valid.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    await User.findByIdAndUpdate(userId, { status });
    res.json({ message: `User ${status}`, status: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
    res.json({ message: "User and their messages deleted", status: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   MESSAGE FEED (paginated)
───────────────────────────────────────────── */
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 30, search = "", userId = "" } = req.query;

    const query = {};
    if (search) query.text = { $regex: search, $options: "i" };
    if (userId) query.$or = [{ senderId: userId }, { receiverId: userId }];

    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .populate("senderId",   "username profilePicture")
      .populate("receiverId", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ messages, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: "Message deleted", status: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  seedAdmin,
  adminLogin,
  getDashboardStats,
  getMessagesPerDay,
  getNewUsersPerDay,
  getPeakHours,
  getUsers,
  updateUserStatus,
  deleteUser,
  getMessages,
  deleteMessage,
};