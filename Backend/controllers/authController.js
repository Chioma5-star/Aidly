import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import Notification from "../models/Notification.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordResetEmail, sendVerificationApprovedEmail, sendWelcomeEmail } from "../services/emailService.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

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

    // Send welcome email
    try { await sendWelcomeEmail(user.email, user.name, user.role); } catch (e) { console.error("Welcome email error:", e.message); }

    res.status(201).json({
        token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" }),
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
          token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" }),
          user: {
              id: user._id, name: user.name, email: user.email,
              role: user.role, points: user.points, isVerified: user.isVerified,
              idCardPath: user.idCardPath || "", phone: user.phone, area: user.area
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

    const { dependents, specificNeed, situation, incomeRange, recipientPhone, recipientAddress } = req.body;
    if (!specificNeed || !situation || !incomeRange) {
        return res.status(400).json({ message: "Please fill in all needs assessment fields" });
    }
    if (!recipientPhone) return res.status(400).json({ message: "Please enter your phone number" });
    if (!recipientAddress) return res.status(400).json({ message: "Please enter your delivery address" });

    // Cloudinary returns path in file.path
    const idCardPath = idCardFile.path || idCardFile.secure_url || `/uploads/${idCardFile.filename}`;
    const proofOfNeedPath = proofFile.path || proofFile.secure_url || `/uploads/${proofFile.filename}`;

    await User.findByIdAndUpdate(req.user._id, {
        idCardPath, proofOfNeedPath,
        dependents: Number(dependents) || 0,
        specificNeed, situation, incomeRange,
        recipientPhone, recipientAddress
    });

    return res.status(200).json({ message: "Verification request submitted!", idCardPath, proofOfNeedPath });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};

// 4. Verify Recipient (Admin) — sends email
export const verifyRecipient = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
        req.params.userId, { isVerified: true }, { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    await createNotification(
        user._id,
        "✅ Your account has been verified! You can now browse and request aid.",
        "ID Verified"
    );

    // Send verification email
    try {
        await sendVerificationApprovedEmail(user.email, user.name);
    } catch (emailErr) {
        console.error("Email send error:", emailErr.message);
    }

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
      role: 'Recipient', isVerified: false,
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
        const topDonors = await User.find({ role: { $regex: /^donor$/i }, points: { $gt: 0 } })
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
        const volunteers = await User.find({ role: 'Volunteer', isVerified: false }).select("-password");
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch pending volunteers" });
    }
};

// 9. Update Volunteer Profile
export const updateVolunteerProfile = async (req, res) => {
    try {
        const { phone, area, vehicle, availability, experience, motivation, emergencyContact } = req.body;
        if (!phone || !area) return res.status(400).json({ message: "Phone and area are required" });

        const updateData = { phone, area };
        if (vehicle) updateData.vehicle = vehicle;
        if (availability) updateData.availability = availability;
        if (experience) updateData.experience = experience;
        if (motivation) updateData.motivation = motivation;
        if (emergencyContact) updateData.emergencyContact = emergencyContact;

        const user = await User.findByIdAndUpdate(
            req.user._id, updateData, { new: true }
        ).select("-password");
        res.json({ message: "Application submitted!", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to submit application" });
    }
};

// 10. Get Me (fresh user data)
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// 11. Forgot Password — send reset email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: "If that email exists, a reset link has been sent." });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendPasswordResetEmail(user.email, user.name, resetToken);

        res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Failed to send reset email" });
    }
};

// 12. Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: "Password reset successful! You can now login." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
};

// 13. Get Platform Stats (Impact Dashboard)
export const getStats = async (req, res) => {
    try {
        const Donation = (await import("../models/Donation.js")).default;

        const [
            totalUsers, totalDonors, totalRecipients, totalVolunteers,
            totalDonations, deliveredDonations,
            donationsByType, donationsByStatus
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "Donor" }),
            User.countDocuments({ role: "Recipient" }),
            User.countDocuments({ role: "Volunteer" }),
            Donation.countDocuments(),
            Donation.countDocuments({ status: "Delivered" }),
            Donation.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
            Donation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

        res.json({
            totalUsers, totalDonors, totalRecipients, totalVolunteers,
            totalDonations, deliveredDonations,
            donationsByType, donationsByStatus
        });
    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};

// 14. Get My Stats (for donor impact section)
export const getMyStats = async (req, res) => {
    try {
        const Donation = (await import("../models/Donation.js")).default;
        const userId = req.user._id;

        const [total, delivered, byType] = await Promise.all([
            Donation.countDocuments({ user: userId }),
            Donation.countDocuments({ user: userId, status: "Delivered" }),
            Donation.aggregate([
                { $match: { user: userId } },
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ])
        ]);

        const user = await User.findById(userId).select("points");

        res.json({ total, delivered, byType, points: user?.points || 0 });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your stats" });
    }
};

// 15. Public Stats (no auth needed — for homepage)
export const getPublicStats = async (req, res) => {
    try {
        const Donation = (await import("../models/Donation.js")).default;

        const [totalDonations, deliveredDonations, totalVolunteers] = await Promise.all([
            Donation.countDocuments({ type: { $ne: "money" } }),
            Donation.countDocuments({ status: "Delivered" }),
            User.countDocuments({ role: "Volunteer", isVerified: true })
        ]);

        res.json({
            itemsDonated: totalDonations,
            peopleHelped: deliveredDonations,
            activeVolunteers: totalVolunteers
        });
    } catch (error) {
        console.error("Public stats error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};

// 16. Reject User (Admin)
export const rejectUser = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Clear their verification docs
        await User.findByIdAndUpdate(req.params.userId, {
            idCardPath: "",
            proofOfNeedPath: "",
            isVerified: false
        });

        // Send rejection email
        try {
            await transporter.sendMail({
                from: `"Aidly" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Your Aidly Verification — Update",
                html: `
                    <div style="font-family:Inter,sans-serif; max-width:500px; margin:auto; padding:32px; background:#f8fafc; border-radius:16px;">
                        <h2 style="color:#14532d;">💚 Aidly</h2>
                        <h3 style="color:#0f172a;">Verification Update</h3>
                        <p style="color:#475569;">Hi <strong>${user.name}</strong>,</p>
                        <p style="color:#475569;">Unfortunately, we were unable to verify your account at this time.</p>
                        ${reason ? `<div style="background:#fef2f2; border-radius:10px; padding:16px; margin:16px 0;"><p style="color:#ef4444; margin:0;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
                        <p style="color:#475569;">You are welcome to re-apply with updated documents by logging in and resubmitting your verification.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://127.0.0.1:5500/frontend'}/login.html" style="display:inline-block; background:#14532d; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:700; margin:16px 0;">Re-apply Now</a>
                        <hr style="border:0; border-top:1px solid #e2e8f0; margin:24px 0;">
                        <p style="color:#94a3b8; font-size:12px;">Aidly — Connecting Help to Those Who Need It</p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error("Rejection email error:", emailErr.message);
        }

        res.json({ message: "User rejected and notified." });
    } catch (error) {
        console.error("Reject error:", error);
        res.status(500).json({ message: "Failed to reject user" });
    }
};

// 17. Delete User (Admin)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role === "Admin") return res.status(403).json({ message: "Cannot delete admin accounts" });

        await User.findByIdAndDelete(req.params.userId);
        res.json({ message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete user" });
    }
};

// 18. Update Profile
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, area } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { name, phone, area },
            { new: true }
        ).select("-password");

        res.json({ message: "Profile updated!", user: updated });
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// 19. Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both fields are required" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: "Password changed successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Failed to change password" });
    }
};