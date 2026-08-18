import Donation from "../models/Donation.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendPaymentConfirmationEmail } from "../services/emailService.js";

async function createNotification(userId, message, type) {
    try {
        await Notification.create({ user: userId, message, type });
    } catch (err) {
        console.error("Notification Error:", err);
    }
}

// 1. Create Donation (with optional image + email confirmation for money)
export const createDonation = async (req, res) => {
    try {
        const { type, amount, description, transactionReference } = req.body;
        const imagePath = req.file ? (req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`) : "";

        const donation = new Donation({
            user: req.user._id,
            type, amount, description, transactionReference, imagePath,
            status: type === 'money' ? 'Completed' : 'available'
        });

        await donation.save();

        if (type === 'money') {
            await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });

            // Send payment confirmation email
            try {
                const user = await User.findById(req.user._id);
                await sendPaymentConfirmationEmail(user.email, user.name, amount, transactionReference || "N/A");
            } catch (emailErr) {
                console.error("Payment email error:", emailErr.message);
            }
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

// 3. Browse all available physical donations (with pagination)
export const getAllDonations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const type = req.query.type || null;
        const search = req.query.search || null;

        const filter = { type: { $ne: "money" }, status: "available" };
        if (type && type !== "all") filter.type = type;
        if (search) filter.description = { $regex: search, $options: "i" };

        const total = await Donation.countDocuments(filter);
        const donations = await Donation.find(filter)
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            donations,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to load donations." });
    }
};

// 4. Recipient: Request an item
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

        await createNotification(
            donation.user,
            `📦 Someone has requested your ${donation.type} donation: "${donation.description || donation.type}".`,
            "Item Requested"
        );

        res.status(200).json({ message: "Item requested successfully!", donation });
    } catch (error) {
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

// 6. Donor: Approve a request
export const approveRequest = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.status !== "Requested") {
            return res.status(400).json({ message: "Can only approve items with Requested status" });
        }

        donation.status = "Approved";
        await donation.save();

        if (donation.recipientId) {
            await createNotification(
                donation.recipientId,
                `✅ Your request for "${donation.description || donation.type}" has been approved!`,
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

// 8. Recipient: Confirm receipt
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

        await User.findByIdAndUpdate(donation.user, { $inc: { points: 50 } });

        await createNotification(
            donation.user,
            `🎉 Your ${donation.type} donation has been received! You've earned 50 points.`,
            "Item Delivered"
        );

        res.json({ message: "Item marked as received! Donor awarded 50 points." });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};

// 9. Admin: Get all donations
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

// 10. Volunteer: Get available tasks
export const getAvailableTasks = async (req, res) => {
    try {
        const tasks = await Donation.find({
            status: "Approved", volunteerId: null, type: { $ne: 'money' }
        })
        .populate("user", "name email phone")
        .populate("recipientId", "name email recipientPhone recipientAddress")
        .sort({ updatedAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};

// 11. Volunteer: Accept a task
export const acceptTask = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.status !== "Approved") {
            return res.status(400).json({ message: "Task is no longer available" });
        }
        if (donation.volunteerId) {
            return res.status(400).json({ message: "Task already taken by another volunteer" });
        }

        donation.volunteerId = req.user._id;
        donation.status = "Delivering";
        await donation.save();

        res.json({ message: "Task accepted!", donation });
    } catch (error) {
        res.status(500).json({ message: "Failed to accept task" });
    }
};

// 12. Volunteer: Get their own tasks
export const getMyTasks = async (req, res) => {
    try {
        const tasks = await Donation.find({ volunteerId: req.user._id })
            .populate("user", "name email phone")
            .populate("recipientId", "name email recipientPhone recipientAddress")
            .sort({ updatedAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your tasks" });
    }
};

// 13. Volunteer: Mark as delivered
export const volunteerMarkDelivered = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        if (donation.volunteerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        donation.status = "Delivered";
        await donation.save();

        await User.findByIdAndUpdate(donation.user, { $inc: { points: 50 } });

        await Notification.create({
            user: donation.user,
            message: `🎉 Your ${donation.type} donation has been delivered by a volunteer!`,
            type: "Item Delivered"
        });

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

// ─── INVENTORY ────────────────────────────────────────────────────────────────

// Admin: Get inventory (all physical donations with quantity info)
export const getInventory = async (req, res) => {
    try {
        const items = await Donation.find({ type: { $ne: "money" } })
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        // Flag low stock and expired items
        const now = new Date();
        const inventory = items.map(item => {
            const obj = item.toObject();
            obj.isLowStock = item.quantity <= item.lowStockThreshold;
            obj.isExpired = item.expiryDate && item.expiryDate < now;
            obj.isExpiringSoon = item.expiryDate &&
                item.expiryDate > now &&
                (item.expiryDate - now) < 3 * 24 * 60 * 60 * 1000; // 3 days
            return obj;
        });

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch inventory" });
    }
};

// Admin: Update inventory item (quantity, expiry, size)
export const updateInventoryItem = async (req, res) => {
    try {
        const { quantity, expiryDate, size, lowStockThreshold } = req.body;
        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { quantity, expiryDate, size, lowStockThreshold },
            { new: true }
        );
        if (!donation) return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Inventory updated!", donation });
    } catch (error) {
        res.status(500).json({ message: "Failed to update inventory" });
    }
};

// Admin: Get inventory summary stats
export const getInventoryStats = async (req, res) => {
    try {
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const [total, lowStock, expired, expiringSoon, byType] = await Promise.all([
            Donation.countDocuments({ type: { $ne: "money" }, status: "available" }),
            Donation.countDocuments({ type: { $ne: "money" }, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }),
            Donation.countDocuments({ type: { $ne: "money" }, expiryDate: { $lt: now } }),
            Donation.countDocuments({ type: { $ne: "money" }, expiryDate: { $gte: now, $lte: threeDays } }),
            Donation.aggregate([
                { $match: { type: { $ne: "money" }, status: "available" } },
                { $group: { _id: "$type", count: { $sum: 1 }, totalQty: { $sum: "$quantity" } } }
            ])
        ]);

        res.json({ total, lowStock, expired, expiringSoon, byType });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch inventory stats" });
    }
};