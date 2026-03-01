import express from "express";
const router = express.Router();

// 1. IMPORT YOUR CONTROLLERS
import { 
    registerUser, 
    loginUser, 
    uploadIdCard, 
    verifyRecipient, 
    getPendingRecipients, 
    getLeaderboard 
} from "../controllers/authController.js";

// 2. IMPORT THE MISSING PIECES (Note the curly braces for both!)
import { protect } from "../middleware/authMiddleware.js"; 
import { upload } from "../middleware/uploadMiddleware.js"; 

// 3. YOUR ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/leaderboard", getLeaderboard);

// The Multer route
router.post("/verify-id", protect, upload.single("idCard"), uploadIdCard);

// Admin routes
router.get("/pending-recipients", protect, getPendingRecipients);
router.put("/verify/:userId", protect, verifyRecipient);

export default router;