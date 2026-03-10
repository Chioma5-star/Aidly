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
    volunteerMarkDelivered
} from "../controllers/donationController.js"; 
import { protect } from "../middleware/authMiddleware.js";

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

// --- GENERAL ROUTES (MUST BE LAST) ---
router.get("/", protect, getAllDonations);
router.post("/", protect, createDonation);

export default router;