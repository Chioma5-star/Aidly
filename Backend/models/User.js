import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin", "Donor", "Volunteer", "Recipient"], default: "Donor" },
    isVerified: { type: Boolean, default: false },
    points: { type: Number, default: 0 },

    // Volunteer fields
    phone: { type: String, default: "" },
    area: { type: String, default: "" },

    // Recipient contact fields
    recipientPhone: { type: String, default: "" },
    recipientAddress: { type: String, default: "" },
    vehicle: { type: String, default: "" },
    availability: { type: String, default: "" },
    experience: { type: String, default: "" },
    motivation: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
    idNumber: { type: String, default: "" },

    // Recipient verification
    idCardPath: { type: String },
    proofOfNeedPath: { type: String },

    // Needs assessment
    dependents: { type: Number, default: 0 },
    specificNeed: {
        type: String,
        enum: ["Food", "Clothing", "Financial", "Medical", "Other", ""],
        default: ""
    },
    situation: { type: String, default: "" },
    incomeRange: {
        type: String,
        enum: ["No income", "Below ₵500", "₵500-₵1000", "Above ₵1000", ""],
        default: ""
    },

    // Password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

}, { timestamps: true });

// Single pre-save hook — no next() needed with async
userSchema.pre("save", async function() {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);