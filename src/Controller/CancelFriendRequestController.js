const User = require("../Model/UserModel");

const cancelFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (!friendId)
      return res.status(400).json({ message: "friendId is required", status: false });

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend)
      return res.status(404).json({ message: "User not found", status: false });

    // Remove request
    user.friendRequestsSent = user.friendRequestsSent.filter(id => id.toString() !== friendId);
    friend.friendRequestsReceived = friend.friendRequestsReceived.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.status(200).json({ message: "Friend request canceled", status: true });
  } catch (error) {
    console.error("Cancel Friend Request Error:", error);
    res.status(500).json({ message: "Server error", status: false });
  }
};

module.exports = cancelFriendRequest;