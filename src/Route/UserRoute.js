const express = require("express");
const userRouter = express.Router();
const verifyToken = require("../middleware/authMiddleware");

const sendFriendRequest        = require("../Controller/SendFriendRequestController");
const getSentFriendRequests    = require("../Controller/GetSentFriendsRquestController");
const acceptFriendRequest      = require("../Controller/AcceptFriendRequestController");
const rejectFriendRequest      = require("../Controller/RejectFriendController");
const cancelFriendRequest      = require("../Controller/CancelFriendRequestController");
const getIncomingFriendRequests = require("../Controller/GetIncomingFriendRequestsController");

// ── ForgotPasswordController is no longer used — OTP logic is in UserController ──
const {
  SignUpUser,
  LoginUser,
  UploadProfilePic,
  RefreshToken,
  getAllUsers,
  ForgotPassword,  // sends 4-digit OTP
  VerifyOTP,       // verifies OTP, returns resetToken
  ResetPassword,   // accepts resetToken + new password (no :token param)
  searchUsers,
  addFriend,
  removeFriend,
  getMyFriends,
  UpdateProfile, 
  ChangePassword
} = require("../Controller/UserController");

// ── Auth ──────────────────────────────────────────────────────────────────────
userRouter.post("/signup",  SignUpUser);
userRouter.post("/login",   LoginUser);
userRouter.post("/refresh-token", verifyToken, RefreshToken);

// ── Password reset (OTP flow — 3 steps) ──────────────────────────────────────
userRouter.post("/forgot-password", ForgotPassword);  // step 1: sends OTP email
userRouter.post("/verify-otp",      VerifyOTP);       // step 2: verify code → get resetToken
userRouter.post("/reset-password",  ResetPassword);   // step 3: resetToken + new password

// ── Profile ───────────────────────────────────────────────────────────────────
userRouter.post("/upload-profile-pic", UploadProfilePic);
userRouter.patch("/update-profile",  verifyToken, UpdateProfile);
userRouter.patch("/change-password", verifyToken, ChangePassword);

// ── Users ─────────────────────────────────────────────────────────────────────
userRouter.get("/users", verifyToken, getAllUsers);

// ── Friends ───────────────────────────────────────────────────────────────────
userRouter.get("/friends",                    verifyToken, getMyFriends);
userRouter.get("/friends/search",             verifyToken, searchUsers);
userRouter.post("/friends/add",               verifyToken, addFriend);
userRouter.delete("/friends/remove/:friendId",verifyToken, removeFriend);
userRouter.get("/friends/requests/sent",      verifyToken, getSentFriendRequests);
userRouter.get("/friends/requests/incoming",  verifyToken, getIncomingFriendRequests);
userRouter.post("/friends/request",           verifyToken, sendFriendRequest);
userRouter.post("/friends/accept",            verifyToken, acceptFriendRequest);
userRouter.post("/friends/reject",            verifyToken, rejectFriendRequest);
userRouter.post("/friends/request/cancel",    verifyToken, cancelFriendRequest);

module.exports = userRouter;