import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET: Fetch all notifications for logged in user
router.get("/", protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// PUT: Mark all notifications as read
router.put("/mark-read", protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ message: "Failed to mark notifications as read" });
    }
});

// GET: Get unread count (for badge)
router.get("/unread-count", protect, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            user: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: "Failed to get unread count" });
    }
});

export default router;