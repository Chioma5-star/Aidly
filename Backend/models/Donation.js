import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // 1. ADD 'recipient' field so the DB knows who requested it
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  type: { type: String, enum: ["money", "clothes", "food", "books", "other"], required: true },
  amount: { type: Number },
  description: { type: String },
  // 2. ADD 'available' and 'pending' to the enum
  status: { 
    type: String, 
    enum: ["available", "pending", "Pending", "Approved", "Delivered"], 
    default: "available" 
  },
  transactionReference: { type: String, sparse: true }
}, { timestamps: true });

export default mongoose.model("Donation", donationSchema);