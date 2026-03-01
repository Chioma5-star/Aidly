import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import jwt from "jsonwebtoken";

// 1. Register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    
    if (ActivityLog && ActivityLog.recordAction) {
        await ActivityLog.recordAction(user._id, "REGISTER", `Role: ${role}`);
    }

    res.status(201).json({ 
        token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET), 
        user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points, isVerified: user.isVerified }
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Error creating account" });
  }
};

// 2. Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (user && (await user.matchPassword(password))) {
      if (ActivityLog && ActivityLog.recordAction) {
          await ActivityLog.recordAction(user._id, "LOGIN", "Login success");
      }
      res.json({ 
          token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET), 
          user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points, isVerified: user.isVerified, idCardPath: user.idCardPath } 
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// 3. Upload ID
export const uploadIdCard = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a file" });
    if (!req.user) return res.status(401).json({ message: "Authentication required" });

    const newPath = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { idCardPath: newPath }, { new: true });

    res.status(200).json({ message: "ID Uploaded!", path: user.idCardPath });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
};

// 4. Verify (Admin)
export const verifyRecipient = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { isVerified: true }, { new: true });
    res.json({ message: "User Verified!", user });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// 5. Get Pending (Admin)
export const getPendingRecipients = async (req, res) => {
  try {
    const pending = await User.find({ 
      role: 'Recipient', 
      isVerified: false, 
      idCardPath: { $exists: true, $ne: "" } 
    }).select("-password");
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending users" });
  }
};

// 6. Leaderboard
export const getLeaderboard = async (req, res) => {
    try {
        const topDonors = await User.find({ role: { $regex: /^donor$/i } })
            .select("name points")
            .sort({ points: -1 })
            .limit(10);
        res.status(200).json(topDonors);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
};