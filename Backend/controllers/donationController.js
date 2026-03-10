import Donation from "../models/Donation.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Helper: Create a notification
async function createNotification(userId, message, type) {
    try {
        await Notification.create({ user: userId, message, type });
    } catch (err) {
        console.error("Notification Error:", err);
    }
}

// 1. Create Donation
export const createDonation = async (req, res) => {
    try {
        const { type, amount, description, transactionReference } = req.body;
        const donation = new Donation({
            user: req.user._id,
            type,
            amount,
            description,
            transactionReference,
            status: type === 'money' ? 'Completed' : 'available'
        });

        await donation.save();

        if (type === 'money') {
            await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });
        }

        res.status(201).json(donation);
    } catch (error) {
        console.error("Create Donation Error:", error);
        res.status(500).json({ message: "Error creating donation" });
    }
};

// 2. Donor: Get own donation history
export const getMyDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(donations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch donation history." });
    }
};

// 3. Browse all available physical donations
export const getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ 
            type: { $ne: 'money' },
            status: 'available'
        }).sort({ createdAt: -1 });
        res.status(200).json(donations);
    } catch (error) {
        res.status(500).json({ message: "Failed to load donations." });
    }
};

// 4. Recipient: Request an item — notifies donor
export const requestItem = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Item not found" });

        const currentStatus = (donation.status || "").toLowerCase().trim();
        if (currentStatus !== "available") {
            return res.status(400).json({ message: `Item is already ${donation.status}.` });
        }

        donation.recipientId = req.user._id;
        donation.status = "Requested";
        await donation.save();

        // Notify the donor that someone requested their item
        await createNotification(
            donation.user,
            `📦 Someone has requested your ${donation.type} donation: "${donation.description || donation.type}".`,
            "Item Requested"
        );

        res.status(200).json({ message: "Item requested successfully!", donation });
    } catch (error) {
        console.error("Request Item Error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

// 5. Donor: See incoming requests
export const getDonorRequests = async (req, res) => {
    try {
        const requests = await Donation.find({ 
            user: req.user._id, 
            status: { $in: ["Requested", "Approved"] }
        }).populate("recipientId", "name email");
        
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching requests" });
    }
};

// 6. Donor: Approve a request — notifies recipient
export const approveRequest = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.status !== "Requested") {
            return res.status(400).json({ message: "Can only approve items with Requested status" });
        }

        donation.status = "Approved";
        await donation.save();

        // Notify the recipient that their request was approved
        if (donation.recipientId) {
            await createNotification(
                donation.recipientId,
                `✅ Your request for "${donation.description || donation.type}" has been approved! The donor will be in touch soon.`,
                "Item Approved"
            );
        }

        res.json({ message: "Request approved!", donation });
    } catch (error) {
        res.status(500).json({ message: "Failed to approve" });
    }
};

// 7. Recipient: See their own requests
export const getMyRequests = async (req, res) => {
    try {
        const requests = await Donation.find({ recipientId: req.user._id })
            .populate("user", "name email")
            .sort({ updatedAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching your requests" });
    }
};

// 8. Recipient: Confirm receipt — notifies donor
export const markAsReceived = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.status !== "Approved") {
            return res.status(400).json({ message: "Item must be Approved before marking as received" });
        }

        if (donation.recipientId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        donation.status = "Delivered";
        await donation.save();

        // Award 50 points to the donor
        await User.findByIdAndUpdate(donation.user, { $inc: { points: 50 } });

        // Notify the donor that their item was delivered
        await createNotification(
            donation.user,
            `🎉 Your ${donation.type} donation has been received and delivered! You've earned 50 points.`,
            "Item Delivered"
        );

        res.json({ message: "Item marked as received! Donor awarded 50 points." });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};

export const getAllDonationsAdmin = async (req, res) => {
    try {
        const donations = await Donation.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json(donations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch all donations" });
    }
};

// Volunteer: Get available tasks (Approved donations with no volunteer)
export const getAvailableTasks = async (req, res) => {
    try {
        const tasks = await Donation.find({
            status: "Approved",
            volunteerId: null,
            type: { $ne: 'money' }
        })
        .populate("user", "name email")
        .populate("recipientId", "name email")
        .sort({ updatedAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};

// Volunteer: Accept a task
export const acceptTask = async (req, res) => {
    try {
        console.log("=== ACCEPT TASK ===");
        console.log("Task ID:", req.params.id);
        console.log("Volunteer ID:", req.user._id);
        
        const donation = await Donation.findById(req.params.id);
        console.log("Donation found:", donation);

        donation.volunteerId = req.user._id;
        donation.status = "Delivering";
        await donation.save();

        res.json({ message: "Task accepted!", donation });
    } catch (error) {
        res.status(500).json({ message: "Failed to accept task" });
    }
};

// Volunteer: Get their own accepted tasks
export const getMyTasks = async (req, res) => {
    try {
        const tasks = await Donation.find({ volunteerId: req.user._id })
            .populate("user", "name email")
            .populate("recipientId", "name email")
            .sort({ updatedAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your tasks" });
    }
};

// Volunteer: Mark as delivered
export const volunteerMarkDelivered = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.volunteerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        donation.status = "Delivered";
        await donation.save();

        // Award points to donor
        await User.findByIdAndUpdate(donation.user, { $inc: { points: 50 } });

        // Notify donor
        await Notification.create({
            user: donation.user,
            message: `🎉 Your ${donation.type} donation has been delivered by a volunteer!`,
            type: "Item Delivered"
        });

        // Notify recipient
        if (donation.recipientId) {
            await Notification.create({
                user: donation.recipientId,
                message: `📦 Your requested ${donation.type} has been delivered! Please confirm receipt.`,
                type: "Item Delivered"
            });
        }

        res.json({ message: "Marked as delivered!" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark as delivered" });
    }
};

