import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", protect, adminOnly, (req, res) => {
  res.json({ message: "Welcome Admin", adminId: req.user.id });
});

export default router;
