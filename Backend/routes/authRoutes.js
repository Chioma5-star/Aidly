import express from "express";
const router = express.Router();

import {
    registerUser,
    loginUser,
    uploadIdCard,
    verifyRecipient,
    getPendingRecipients,
    getLeaderboard,
    getAllUsers,
    getPendingVolunteers,
    updateVolunteerProfile,
    getMe,
    forgotPassword,
    resetPassword,
    getStats,
    getMyStats,
    getPublicStats
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/leaderboard", getLeaderboard);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/public-stats", getPublicStats);

// Protected routes
router.get("/me", protect, getMe);
router.get("/all-users", protect, getAllUsers);
router.get("/pending-volunteers", protect, getPendingVolunteers);
router.get("/stats", protect, getStats);
router.get("/my-stats", protect, getMyStats);
router.put("/volunteer-profile", protect, updateVolunteerProfile);

// Upload ID + Proof of Need
router.post(
    "/verify-id",
    upload.fields([
        { name: "idCard", maxCount: 1 },
        { name: "proofOfNeed", maxCount: 1 }
    ]),
    protect,
    uploadIdCard
);

// Admin routes
router.get("/pending-verifications", protect, getPendingRecipients);
router.put("/verify-user/:userId", protect, verifyRecipient);

export default router;