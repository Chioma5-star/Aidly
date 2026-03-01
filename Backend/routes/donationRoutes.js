import express from "express";
// ALL IMPORTS INCLUDED HERE:
import { 
    createDonation, 
    getMyDonations, 
    getAllDonations, 
    requestItem,
    getDonorRequests,
    approveRequest,
    getMyRequests,
    markAsReceived
} from "../controllers/donationController.js"; 
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- DONOR ROUTES ---
// 1. Create a new donation (Money or Physical)
router.post("/", protect, createDonation);

// 2. Get history of donations I have MADE
router.get("/my", protect, getMyDonations);

// 3. Get requests made by OTHERS for my items
router.get("/donor-requests", protect, getDonorRequests);

// 4. Approve a specific request from a recipient
router.put("/approve/:donationId", protect, approveRequest);


// --- RECIPIENT ROUTES ---
// 5. Browse all available aid (General Feed)
router.get("/", protect, getAllDonations);

// 6. Send a request for a specific item
router.post("/request", protect, requestItem);

// 7. Get history of requests I have SENT
router.get("/my-requests", protect, getMyRequests);

// 8. Confirm that I have physically received the item
router.put("/received/:donationId", protect, markAsReceived);

export default router;