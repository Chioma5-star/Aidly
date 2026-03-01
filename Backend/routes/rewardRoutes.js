// backend/routes/rewardRoutes.js
import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { createReward, getRewards } from "../controllers/rewardController.js";

const router = express.Router();

router.post("/", protect, adminOnly, createReward);
router.get("/", getRewards);

export default router;
