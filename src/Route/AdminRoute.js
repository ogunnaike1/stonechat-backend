const express     = require("express");
const adminRouter = express.Router();
const verifyAdmin = require("../middleware/authMiddleware");
const {
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
} = require("../Controller/AdminController");

// ── Public ────────────────────────────────────────────────────────────────────
adminRouter.post("/login", adminLogin);
// adminRouter.post("/seed",  seedAdmin); // call once to create first admin, then remove

// ── Protected (admin JWT required) ───────────────────────────────────────────
adminRouter.get("/stats",                    verifyAdmin, getDashboardStats);
adminRouter.get("/charts/messages",          verifyAdmin, getMessagesPerDay);
adminRouter.get("/charts/users",             verifyAdmin, getNewUsersPerDay);
adminRouter.get("/charts/hours",             verifyAdmin, getPeakHours);
adminRouter.get("/users",                    verifyAdmin, getUsers);
adminRouter.patch("/users/:userId/status",   verifyAdmin, updateUserStatus);
adminRouter.delete("/users/:userId",         verifyAdmin, deleteUser);
adminRouter.get("/messages",                 verifyAdmin, getMessages);
adminRouter.delete("/messages/:messageId",   verifyAdmin, deleteMessage);

module.exports = adminRouter;