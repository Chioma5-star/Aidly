import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: { type: String, required: true },
  description: { type: String },
  amount: { type: Number },
  transactionReference: { type: String },
  status: {
    type: String,
    enum: ['available', 'Requested', 'Approved', 'Delivering', 'Delivered', 'Completed', 'Pending'],
    default: 'available'
  }

}, { timestamps: true });

export default mongoose.model("Donation", donationSchema);