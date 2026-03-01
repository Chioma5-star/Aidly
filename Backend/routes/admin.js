import express from "express";

import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/summary", protect, adminOnly, async (req, res) => {
  try {
    // existing logic
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


export default router;
