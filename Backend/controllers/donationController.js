import Donation from "../models/Donation.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js"; // Needed to update points
import axios from "axios";


// Inside controllers/donationController.js -> createDonation
export const createDonation = async (req, res) => {
    try {
        const { type, amount, description, transactionReference } = req.body;
        const donation = new Donation({
            user: req.user._id,
            type,
            amount,
            description,
            transactionReference,
            status: type === 'money' ? 'Completed' : 'Pending'
        });

        await donation.save();

        // AWARD 10 POINTS FOR MONEY IMMEDIATELY
        if (type === 'money') {
            const User = await import("../models/User.js").then(m => m.default);
            await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });
        }

        res.status(201).json(donation);
    } catch (error) {
        res.status(500).json({ message: "Error creating donation" });
    }
};

export const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch donation history." });
  }
};
// NEW: Get all donations for the Recipient Feed
export const getAllDonations = async (req, res) => {
  try {
    // We import your Donation model (assuming it's imported at the top of your file)
    // This finds all items, sorting the newest ones to the top
    const donations = await Donation.find().sort({ createdAt: -1 });
    
    res.status(200).json(donations);
  } catch (error) {
    console.error("Error fetching all donations:", error);
    res.status(500).json({ message: "Failed to load donations." });
  }
};
export const requestItem = async (req, res) => {
    try {
        const { itemId } = req.body;
        const donation = await Donation.findById(itemId);
        
        // Use a case-insensitive check or ensure your DB uses "available"
        if (!donation || donation.status.toLowerCase() !== 'available') {
            return res.status(400).json({ message: "Item no longer available" });
        }

        donation.status = 'pending'; // This must match an option in your Schema enum
        donation.recipient = req.user.id; // Use .id to match your createDonation style
        await donation.save();

        if (ActivityLog) {
            await ActivityLog.recordAction(req.user.id, "REQUEST_ITEM", `Requested: ${donation.type}`);
        }

        res.json({ message: "Request sent successfully! Wait for donor approval." });
    } catch (error) {
        console.error("Request Error:", error); // This will now show the REAL error in your terminal
        res.status(500).json({ message: "Server error during request" });
    }
};
export const getDonorRequests = async (req, res) => {
    try {
        // Find donations created by this donor that have a recipient (status: pending)
        const myDonations = await Donation.find({ 
            user: req.user.id, 
            status: "pending" 
        }).populate("recipient", "name email"); // This lets you see the recipient's details

        res.json(myDonations);
    } catch (error) {
        res.status(500).json({ message: "Error fetching requests" });
    }
};

export const approveRequest = async (req, res) => {
    try {
        const { donationId } = req.params;
        const donation = await Donation.findById(donationId);

        if (!donation) return res.status(404).json({ message: "Donation not found" });

        donation.status = "Approved"; 
        await donation.save();

        // Optional: Send a notification or log activity for the donor
        if (ActivityLog) {
            await ActivityLog.recordAction(req.user.id, "APPROVE_REQUEST", `Approved item for ${donation.recipient}`);
        }

        res.json({ message: "Request approved! The recipient has been notified." });
    } catch (error) {
        res.status(500).json({ message: "Failed to approve request" });
    }
};
export const getMyRequests = async (req, res) => {
    try {
        // Find donations where the RECIPIENT is the current user
        const requests = await Donation.find({ recipient: req.user._id })
            .populate("user", "name email") // This lets the recipient see the DONOR'S contact info
            .sort({ updatedAt: -1 });
            
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching your requests" });
    }
};
export const markAsReceived = async (req, res) => {
    try {
        const { donationId } = req.params;
        const donation = await Donation.findById(donationId);

        if (!donation) return res.status(404).json({ message: "Donation not found" });

        donation.status = "Delivered";
        await donation.save();

        // AWARD POINTS TO THE DONOR
        const User = await import("../models/User.js").then(m => m.default);
        await User.findByIdAndUpdate(donation.user, { $inc: { points: 50 } });

        res.json({ message: "Item received! Donor awarded 50 points." });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};