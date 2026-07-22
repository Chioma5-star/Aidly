import express from "express";
import Location from "../models/Location.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all active locations (public)
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true });
    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch locations" });
  }
});

// GET single location
router.get("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, error: "Location not found" });
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch location" });
  }
});

// POST create location (Admin only)
router.post("/", protect, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  const { name, address, region, gpsCoordinates, type, operatingHours, contactPhone } = req.body;
  if (!name || !address || !gpsCoordinates?.lat || !gpsCoordinates?.lng) {
    return res.status(400).json({ success: false, error: "name, address, and gpsCoordinates are required" });
  }
  try {
    const location = await Location.create({ name, address, region, gpsCoordinates, type, operatingHours, contactPhone });
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create location" });
  }
});

// DELETE location (Admin only)
router.delete("/:id", protect, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  try {
    await Location.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Location deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to deactivate location" });
  }
});

export default router;