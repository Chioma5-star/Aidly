import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    region: {
      type: String,
      default: "Tantra Hills",
    },
    gpsCoordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    type: {
      type: String,
      enum: ["donation_center", "pickup_point", "distribution_center"],
      default: "donation_center",
    },
    operatingHours: {
      type: String,
      default: "Mon-Fri, 8AM-5PM",
    },
    contactPhone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);