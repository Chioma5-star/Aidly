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
  imagePath: { type: String, default: "" },
  status: {
    type: String,
    enum: ['available', 'Requested', 'Approved', 'Delivering', 'Delivered', 'Completed', 'Pending'],
    default: 'available'
  },

  // Inventory fields
  quantity: { type: Number, default: 1 },
  expiryDate: { type: Date, default: null },  // for food
  size: { type: String, default: "" },         // for clothes (S, M, L, XL etc)
  lowStockThreshold: { type: Number, default: 1 }

}, { timestamps: true });

export default mongoose.model("Donation", donationSchema);