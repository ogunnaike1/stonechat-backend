const nodemailer = require("nodemailer");

// ── Transporter ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // ← one consistent variable name
    pass: process.env.EMAIL_PASS,
  },
});

/** Generate a random 4-digit OTP string */
const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const baseStyle = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background: #070a0f;
  color: #ffffff;
  margin: 0;
  padding: 0;
`;

// ── WELCOME MAIL ───────────────────────────────────────────────────────────────
const sendWelcomeMail = async (toEmail, username) => {
  const html = `
    <div style="${baseStyle}">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#070a0f; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 20px;
              overflow: hidden;
            ">
              <tr>
                <td style="height:3px; background: linear-gradient(90deg,#00f5a0,#00d9f5,#7b2fff);"></td>
              </tr>
              <tr>
                <td align="center" style="padding: 36px 40px 24px;">
                  <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #00f5a0;">StoneChat</div>
                  <div style="margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.35); letter-spacing: 1.5px; text-transform: uppercase;">
                    Welcome aboard
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 32px;">
                  <p style="font-size: 15px; color: rgba(255,255,255,0.85); line-height: 1.7; margin: 0 0 16px;">
                    Hey <strong style="color:#00f5a0;">${username}</strong> 👋
                  </p>
                  <p style="font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.7; margin: 0 0 24px;">
                    Your StoneChat account is all set. Start conversations, connect with friends, and chat in real time.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                    ${[
                      ["💬", "Real-time messaging with instant delivery"],
                      ["🔔", "Smart notifications so you never miss a message"],
                      ["🤝", "Add friends and grow your network"],
                    ].map(([icon, text]) => `
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                          <span style="font-size: 16px;">${icon}</span>
                          <span style="font-size: 13px; color: rgba(255,255,255,0.5); margin-left: 10px;">${text}</span>
                        </td>
                      </tr>`).join("")}
                  </table>
                  <div align="center">
                    <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login"
                      style="display: inline-block; padding: 13px 36px; background: #00f5a0; color: #000; font-weight: 700; font-size: 14px; border-radius: 50px; text-decoration: none;">
                      Start Chatting →
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: rgba(255,255,255,0.2);">
                  You received this because you created a StoneChat account.<br/>
                  If this wasn't you, please ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: `"StoneChat" <${process.env.EMAIL_USER}>`, // ← EMAIL_USER, not MAIL_USER
    to: toEmail,
    subject: "Welcome to StoneChat 🎉",
    html,
  });
};

// ── OTP RESET MAIL ─────────────────────────────────────────────────────────────
const sendPasswordResetOTP = async (toEmail, username, otp) => {
  const digits = otp.split("").map((d) => `
    <td align="center" style="
      width: 52px; height: 60px;
      background: rgba(0,245,160,0.06);
      border: 1px solid rgba(0,245,160,0.25);
      border-radius: 12px;
      font-size: 28px; font-weight: 800;
      color: #00f5a0; letter-spacing: 0;
    ">${d}</td>`);

  const html = `
    <div style="${baseStyle}">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#070a0f; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 20px;
              overflow: hidden;
            ">
              <tr>
                <td style="height:3px; background: linear-gradient(90deg,#ff4d6a,#7b2fff,#00d9f5);"></td>
              </tr>
              <tr>
                <td align="center" style="padding: 36px 40px 20px;">
                  <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #00f5a0;">StoneChat</div>
                  <div style="margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.35); letter-spacing: 1.5px; text-transform: uppercase;">
                    Password Reset
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 32px;">
                  <p style="font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.7; margin: 0 0 8px;">
                    Hi <strong style="color:#fff;">${username}</strong>,
                  </p>
                  <p style="font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.7; margin: 0 0 28px;">
                    Use the code below to reset your password. It expires in <strong style="color:rgba(255,255,255,0.7);">10 minutes</strong>.
                  </p>
                  <div align="center" style="margin-bottom: 28px;">
                    <table cellpadding="0" cellspacing="10" style="border-collapse: separate;">
                      <tr>${digits.join("")}</tr>
                    </table>
                  </div>
                  <div style="
                    background: rgba(255,77,106,0.07);
                    border: 1px solid rgba(255,77,106,0.2);
                    border-radius: 10px;
                    padding: 12px 16px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                    line-height: 1.6;
                  ">
                    ⚠️ Never share this code with anyone. StoneChat staff will never ask for it.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: rgba(255,255,255,0.2);">
                  If you didn't request a password reset, you can safely ignore this email.<br/>
                  This code will expire automatically.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: `"StoneChat" <${process.env.EMAIL_USER}>`, // ← EMAIL_USER, not MAIL_USER
    to: toEmail,
    subject: "Your StoneChat reset code",
    html,
  });
};

module.exports = { generateOTP, sendWelcomeMail, sendPasswordResetOTP };