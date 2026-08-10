import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists", expired: true });
      }

      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired. Please login again.", expired: true });
      }
      return res.status(401).json({ message: "Not authorized, token failed", expired: true });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token", expired: true });
  }
};