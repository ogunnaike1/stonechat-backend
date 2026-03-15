// Controller/GetIncomingFriendRequestsController.js
const userModel = require("../Model/UserModel");

const getIncomingFriendRequests = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .populate("friendRequestsReceived", "username profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.friendRequestsReceived);
  } catch (err) {
    console.error("getIncomingFriendRequests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = getIncomingFriendRequests;