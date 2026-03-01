import Donation from "../models/Donation.js";
import User from "../models/User.js";

export const getAdminSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonations = await Donation.countDocuments();

    const totalAmountAgg = await Donation.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalAmount = totalAmountAgg[0]?.total || 0;

    res.json({
      totalUsers,
      totalDonations,
      totalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
