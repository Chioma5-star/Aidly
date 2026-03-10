import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import Notification from "../models/Notification.js";
import jwt from "jsonwebtoken";

// Helper: Create a notification
async function createNotification(userId, message, type) {
    try {
        await Notification.create({ user: userId, message, type });
    } catch (err) {
        console.error("Notification Error:", err);
    }
}

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
          user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              points: user.points,
              isVerified: user.isVerified,
              idCardPath: user.idCardPath,
              phone: user.phone,
              area: user.area
          }
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// 3. Upload ID + Proof of Need + Needs Assessment
export const uploadIdCard = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });

    const files = req.files;
    const idCardFile = files?.idCard?.[0];
    const proofFile = files?.proofOfNeed?.[0];

    if (!idCardFile) return res.status(400).json({ message: "Please upload your Ghana Card" });
    if (!proofFile) return res.status(400).json({ message: "Please upload a proof of need document" });

    const { dependents, specificNeed, situation, incomeRange } = req.body;
    if (!specificNeed || !situation || !incomeRange) {
        return res.status(400).json({ message: "Please fill in all needs assessment fields" });
    }

    const idCardPath = `/uploads/${idCardFile.filename}`;
    const proofOfNeedPath = `/uploads/${proofFile.filename}`;

    await User.findByIdAndUpdate(req.user._id, {
        idCardPath,
        proofOfNeedPath,
        dependents: Number(dependents) || 0,
        specificNeed,
        situation,
        incomeRange
    });

    return res.status(200).json({ message: "Verification request submitted!", idCardPath, proofOfNeedPath });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};

// 4. Verify Recipient (Admin)
export const verifyRecipient = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
        req.params.userId,
        { isVerified: true },
        { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    await createNotification(
        user._id,
        "✅ Your account has been verified! You can now browse and request aid.",
        "ID Verified"
    );

    res.json({ message: "User Verified!", user });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};

// 5. Get Pending Recipients (Admin)
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

// 7. Get All Users (Admin)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// 8. Get Pending Volunteers (Admin)
export const getPendingVolunteers = async (req, res) => {
    try {
        const volunteers = await User.find({
            role: 'Volunteer',
            isVerified: false
        }).select("-password");
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch pending volunteers" });
    }
};

// 9. Update Volunteer Profile
export const updateVolunteerProfile = async (req, res) => {
    try {
        const { phone, area } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { phone, area },
            { new: true }
        ).select("-password");
        res.json({ message: "Profile updated!", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile" });
    }
};
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};