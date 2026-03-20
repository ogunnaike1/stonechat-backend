const mongoose = require("mongoose");
const userModel = require("../Model/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../utils/Cloudinary");
const { isPasswordValid, getPasswordErrors } = require("../utils/passwordValidator");
const { generateOTP, sendWelcomeMail, sendPasswordResetOTP } = require("../utils/Mailer");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

/* ─────────────────────────────────────────────
   SIGN UP
───────────────────────────────────────────── */
const SignUpUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required", status: false });
    }

    if (!isPasswordValid(password)) {
      const errors = getPasswordErrors(password);
      return res.status(400).json({
        message: "Password does not meet requirements",
        status: false,
        passwordErrors: errors.map((e) => e.label),
      });
    }

    const hashedpassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({ username, email, password: hashedpassword });

    if (newUser) {
      // Fire-and-forget welcome email — don't block the response
      sendWelcomeMail(email, username).catch((err) =>
        console.error("Welcome mail failed:", err.message)
      );

      return res.status(201).json({
        message: "User created successfully",
        status: true,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const messages = {
        username: "That username is already taken. Please choose a different one.",
        email: "An account with that email already exists. Try logging in instead.",
      };
      return res.status(409).json({
        message: messages[field] || "Duplicate field value.",
        field,
        status: false,
      });
    }

    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────── */
const LoginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required", status: false });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist", status: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password", status: false });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d"  });

    return res.status(200).json({
      token,
      message: "Login successful",
      status: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   UPLOAD PROFILE PICTURE
───────────────────────────────────────────── */
const UploadProfilePic = async (req, res) => {
  try {
    const { userId, image } = req.body;

    if (!userId || !image) {
      return res.status(400).json({ message: "userId and image are required", status: false });
    }

    const profileImage = await cloudinary.uploader.upload(image, { folder: "profile_pictures" });

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { profilePicture: profileImage.secure_url },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    return res.status(200).json({
      message: "Profile picture updated successfully",
      status: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (error) {
    console.error("UploadProfilePic error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

// ── Add this function to UserController.js ────────────────────────────────────

const RefreshToken = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("_id email username profilePicture");
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" } // ← must match LoginUser
    );

    return res.status(200).json({ token, status: true });
  } catch (error) {
    console.error("RefreshToken error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   FORGOT PASSWORD — sends 4-digit OTP
───────────────────────────────────────────── */
const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required", status: false });
    }

    const user = await userModel.findOne({ email });

    // Always 200 — don't leak whether the email is registered
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a reset code has been sent.",
        status: true,
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOTP = otp;
    user.resetOTPExpires = expiresAt;
    await user.save();

    await sendPasswordResetOTP(email, user.username, otp);

    return res.status(200).json({
      message: "Reset code sent to your email.",
      status: true,
    });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   VERIFY OTP
───────────────────────────────────────────── */
const VerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required", status: false });
    }

    const user = await userModel.findOne({
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code", status: false });
    }

    // Short-lived JWT so the client can proceed to step 3 without re-entering email
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ message: "Code verified", status: true, resetToken });
  } catch (error) {
    console.error("VerifyOTP error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   RESET PASSWORD — requires resetToken from VerifyOTP
───────────────────────────────────────────── */
const ResetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({ message: "Token and new password are required", status: false });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Reset session expired. Please start again.", status: false });
    }

    if (!isPasswordValid(password)) {
      const errors = getPasswordErrors(password);
      return res.status(400).json({
        message: "Password does not meet requirements",
        status: false,
        passwordErrors: errors.map((e) => e.label),
      });
    }

    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful", status: true });
  } catch (error) {
    console.error("ResetPassword error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/* ─────────────────────────────────────────────
   USER QUERIES
───────────────────────────────────────────── */
const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find(
      { _id: { $ne: req.user.id } },
      "username email profilePicture socketId"
    );
    res.status(200).json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyFriends = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).populate("friends", "username profilePicture");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.friends);
  } catch (err) {
    console.error("getMyFriends error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    if (!query || !query.trim()) return res.status(200).json([]);

    const me = await userModel.findById(userId);
    const friends = me.friends || [];
    const sent = me.friendRequestsSent || [];

    const users = await userModel
      .find({
        _id: { $ne: userId, $nin: [...friends, ...sent] },
        username: { $regex: query, $options: "i" },
      })
      .select("username profilePicture");

    res.status(200).json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const addFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.body;

    if (!friendId) return res.status(400).json({ message: "friendId required" });
    if (userId === friendId) return res.status(400).json({ message: "You cannot add yourself" });

    const user = await userModel.findById(userId);
    const friend = await userModel.findById(friendId);

    if (!friend) return res.status(404).json({ message: "User not found" });
    if (user.friends.includes(friendId)) return res.status(400).json({ message: "Already friends" });

    user.friends.push(friendId);
    friend.friends.push(userId);
    await user.save();
    await friend.save();

    res.status(200).json({ message: "Friend added", friendId });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const user = await userModel.findById(userId);
    const friend = await userModel.findById(friendId);

    if (!friend) return res.status(404).json({ message: "User not found" });

    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.status(200).json({ message: "Friend removed", friendId });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const UpdateProfile = async (req, res) => {
  try {
    const { userId, username, email } = req.body;
 
    if (!userId || !username || !email) {
      return res.status(400).json({ message: "userId, username and email are required", status: false });
    }
 
    // Check username uniqueness (exclude current user)
    const existingUsername = await userModel.findOne({ username, _id: { $ne: userId } });
    if (existingUsername) {
      return res.status(409).json({ message: "That username is already taken.", status: false });
    }
 
    // Check email uniqueness (exclude current user)
    const existingEmail = await userModel.findOne({ email, _id: { $ne: userId } });
    if (existingEmail) {
      return res.status(409).json({ message: "That email is already in use.", status: false });
    }
 
    const updated = await userModel.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true }
    ).select("_id username email profilePicture");
 
    if (!updated) {
      return res.status(404).json({ message: "User not found", status: false });
    }
 
    return res.status(200).json({
      message: "Profile updated",
      status: true,
      user: { id: updated._id, username: updated.username, email: updated.email, profilePicture: updated.profilePicture },
    });
  } catch (error) {
    console.error("UpdateProfile error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};
 
/* ─────────────────────────────────────────────
   CHANGE PASSWORD
   PATCH /user/change-password
   Body: { userId, currentPassword, newPassword }
───────────────────────────────────────────── */
const ChangePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
 
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required", status: false });
    }
 
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }
 
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect", status: false });
    }
 
    // Validate new password strength
    if (!isPasswordValid(newPassword)) {
      const errors = getPasswordErrors(newPassword);
      return res.status(400).json({
        message: "New password does not meet requirements",
        status: false,
        passwordErrors: errors.map(e => e.label),
      });
    }
 
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
 
    return res.status(200).json({ message: "Password changed successfully", status: true });
  } catch (error) {
    console.error("ChangePassword error:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

module.exports = {
  SignUpUser,
  LoginUser,
  UploadProfilePic,
  RefreshToken,
  ForgotPassword,
  VerifyOTP,
  ResetPassword,
  getAllUsers,
  searchUsers,
  addFriend,
  removeFriend,
  getMyFriends,
  UpdateProfile, 
  ChangePassword
};