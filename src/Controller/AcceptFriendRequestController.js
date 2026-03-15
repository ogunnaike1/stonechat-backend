const userModel = require("../Model/UserModel")

const acceptFriendRequest = async (req, res) => {
    try {
      const userId = req.user.id;
      const { senderId } = req.body;
  
      const user = await userModel.findById(userId);
      const sender = await userModel.findById(senderId);
  
      // Remove request
      user.friendRequestsReceived =
        user.friendRequestsReceived.filter(
          (id) => id.toString() !== senderId
        );
  
      sender.friendRequestsSent =
        sender.friendRequestsSent.filter(
          (id) => id.toString() !== userId
        );
  
      // Add as friends
      user.friends.push(senderId);
      sender.friends.push(userId);
  
      await user.save();
      await sender.save();
  
      res.status(200).json({ message: "Friend request accepted" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  };
  
  module.exports = acceptFriendRequest