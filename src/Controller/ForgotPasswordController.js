const crypto = require("crypto");
const nodemailer = require("nodemailer");
const userModel = require("../Model/UserModel")


const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required", status: false });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: "StoneChat <no-reply@stonechat.com>",
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>You requested a password reset</p>
        <p>Click the link below:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes</p>
      `,
    });

    res.status(200).json({
      message: "Password reset link sent",
      status: true,
    });

  } catch (error) {
    console.error("ForgotPassword error:", error);
    res.status(500).json({ message: "Server error", status: false });
  }
};
module.exports =  ForgotPassword
