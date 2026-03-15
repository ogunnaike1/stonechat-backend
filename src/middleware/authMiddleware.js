const jwt = require("jsonwebtoken");
const User = require("../Model/UserModel");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Block admin tokens from accessing user routes
    if (decoded.isAdmin) {
      return res.status(403).json({ message: "Admin token cannot access user routes" });
    }

    // Check user still exists and is not banned/suspended
    const user = await User.findById(decoded.id).select("status");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    if (user.status === "banned") {
      return res.status(403).json({ message: "Your account has been banned" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = verifyToken;