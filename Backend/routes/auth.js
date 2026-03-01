// routes/auth.js
import express from "express";
import { 
    registerUser, 
    loginUser, 
    uploadIdCard, 
    getPendingRecipients, // Add this
    verifyRecipient        // Add this
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Ensure 'idCard' matches the name in your frontend FormData.append("idCard", ...)
router.post("/verify-id", protect, upload.single("idCard"), uploadIdCard);

/* =========================================
   ADMIN ROUTES
   ========================================= */
// Fetch all recipients waiting for approval
router.get("/pending", protect, getPendingRecipients);

// Approve a specific recipient
router.post("/verify/:userId", protect, verifyRecipient);

export default router;