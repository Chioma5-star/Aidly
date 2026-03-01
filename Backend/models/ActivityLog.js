import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  details: { type: String }
}, { timestamps: true });

activityLogSchema.statics.recordAction = function(userId, action, details) {
  return this.create({ user: userId, action, details });
};

export default mongoose.model("ActivityLog", activityLogSchema);