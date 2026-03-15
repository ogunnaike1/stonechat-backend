// Controller/GetSentFriendRequestsController.js

const userModel = require("../Model/UserModel");

const getSentFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await userModel
      .findById(userId)
      .populate("friendRequestsSent", "username profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.friendRequestsSent);

  } catch (error) {
    console.error("getSentFriendRequests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = getSentFriendRequests;