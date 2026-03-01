import express from "express";
import Donation from "../models/Donation.js";
import jwt from "jsonwebtoken";

const router = express.Router();


const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};

// Create donation
router.post("/", protect, async (req, res) => {
  try {
    const { type, amount, description } = req.body;

    const donation = await Donation.create({
      user: req.user.id,
      type,
      amount,
      description
    });

    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get logged-in user's donations
router.get("/my", protect, async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// Get all donations (Browse Aid for Recipients)
router.get("/", protect, async (req, res) => {
  try {
    // This fetches every donation in the database
    const donations = await Donation.find().sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: "Error fetching aid list" });
  }
});

export default router;
