import mongoose from "mongoose";
import bcrypt from "bcryptjs";
// models/User.js
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin", "Donor","Volunteer", "Recipient"], default: "Donor" },
    isVerified: { type: Boolean, default: false },
    idCardPath: { type: String },
    points: { type: Number, default: 0 }
}, { timestamps: true });


userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) next();
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);