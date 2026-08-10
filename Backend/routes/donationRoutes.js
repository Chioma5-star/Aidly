import express from "express";
import { 
    createDonation, 
    getMyDonations, 
    getAllDonations, 
    requestItem,
    getDonorRequests,
    approveRequest,
    getMyRequests,
    markAsReceived,
    getAllDonationsAdmin,
    getAvailableTasks, 
    acceptTask, 
    getMyTasks, 
    volunteerMarkDelivered,
    getInventory,
    updateInventoryItem,
    getInventoryStats
} from "../controllers/donationController.js"; 
import { protect } from "../middleware/authMiddleware.js";
import { upload, uploadDonationImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ⚠️ ALL specific routes MUST come before GET "/" which catches everything

// --- DONOR ROUTES ---
router.get("/my", protect, getMyDonations);
router.get("/donor-requests", protect, getDonorRequests);
router.put("/approve/:id", protect, approveRequest);

// --- RECIPIENT ROUTES ---
router.get("/my-requests", protect, getMyRequests);
router.put("/request/:id", protect, requestItem);
router.put("/received/:id", protect, markAsReceived);

// --- ADMIN ROUTES ---
router.get("/all", protect, getAllDonationsAdmin);

// --- VOLUNTEER ROUTES ---
router.get("/available-tasks", protect, getAvailableTasks);
router.get("/my-tasks", protect, getMyTasks);
router.put("/accept-task/:id", protect, acceptTask);
router.put("/volunteer-delivered/:id", protect, volunteerMarkDelivered);

// --- INVENTORY ROUTES ---
router.get("/inventory", protect, getInventory);
router.get("/inventory-stats", protect, getInventoryStats);
router.put("/inventory/:id", protect, updateInventoryItem);

// --- GENERAL ROUTES (MUST BE LAST) ---
router.get("/", protect, getAllDonations);
// Money donations — JSON body
router.post("/money", protect, createDonation);
// Physical donations — FormData with optional image
router.post("/", uploadDonationImage.single("donationImage"), protect, createDonation);

export default router;