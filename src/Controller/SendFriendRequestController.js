const User = require("../Model/UserModel");

const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (senderId === receiverId)
      return res.status(400).json({ message: "Cannot add yourself" });

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) return res.status(404).json({ message: "User not found" });

    // Already friends?
    if (sender.friends.includes(receiverId))
      return res.status(400).json({ message: "Already friends" });

    // Already sent request?
    if (sender.friendRequestsSent.includes(receiverId))
      return res.status(400).json({ message: "Request already sent" });

    sender.friendRequestsSent.push(receiverId);
    receiver.friendRequestsReceived.push(senderId);

    await sender.save();
    await receiver.save();

    res.status(200).json({ message: "Friend request sent", status: true });
  } catch (err) {
    console.error("Send Friend Request Error:", err);
    res.status(500).json({ message: "Server error", status: false });
  }
};

module.exports = sendFriendRequest;