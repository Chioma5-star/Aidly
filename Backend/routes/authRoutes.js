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
    getMe
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/leaderboard", getLeaderboard);
router.get("/all-users", protect, getAllUsers);
router.get("/pending-volunteers", protect, getPendingVolunteers);
router.put("/volunteer-profile", protect, updateVolunteerProfile);
router.get("/me", protect, getMe);

// Upload ID + Proof of Need — multer handles both files, then auth, then controller
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