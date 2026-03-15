const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    profilePicture: String,
    socketId:       String,

    // ── Admin-managed ────────────────────────────────────────────────────────
    status:      { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    reportCount: { type: Number, default: 0 },

    // ── Password reset (OTP-based) ───────────────────────────────────────────
    resetOTP:        String,
    resetOTPExpires: Date,

    // ── Friends ──────────────────────────────────────────────────────────────
    friends: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user_collection" },
    ],
    friendRequestsSent: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user_collection" },
    ],
    friendRequestsReceived: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user_collection" },
    ],
  },
  { timestamps: true }
);

const userModel = mongoose.model("user_collection", UserSchema);
module.exports = userModel;