import dotenv from "dotenv";
dotenv.config();
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Loaded" : "Missing");

// ── Check if Cloudinary is configured ────────────────────────────────────────
const useCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let upload;
let uploadDonationImage;

if (useCloudinary) {
    // ── Cloudinary storage ────────────────────────────────────────────────────
    console.log("✅ Using Cloudinary for file uploads");

    const { v2: cloudinary } = await import("cloudinary");
    const { CloudinaryStorage } = await import("multer-storage-cloudinary");

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const verificationStorage = new CloudinaryStorage({
        cloudinary,
        params: (req, file) => ({
            folder: "aidly/verification",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            public_id: `${file.fieldname}-${Date.now()}`,
            resource_type: "auto"
        })
    });

    const donationStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "aidly/donations",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            transformation: [{ width: 800, height: 600, crop: "limit", quality: "auto" }]
        }
    });

    upload = multer({ storage: verificationStorage, limits: { fileSize: 5 * 1024 * 1024 } });
    uploadDonationImage = multer({ storage: donationStorage, limits: { fileSize: 5 * 1024 * 1024 } });

} else {
    // ── Local disk storage (fallback) ─────────────────────────────────────────
    console.log("⚠️  Cloudinary not configured — using local storage");

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const localStorage = multer.diskStorage({
        destination(req, file, cb) { cb(null, uploadsDir); },
        filename(req, file, cb) {
            const prefix = file.fieldname || "file";
            cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`);
        }
    });

    function fileFilter(req, file, cb) {
        const allowed = /jpg|jpeg|png|pdf|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        if (ext) cb(null, true);
        else cb(new Error("Only images and PDFs allowed!"));
    }

    upload = multer({ storage: localStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
    uploadDonationImage = multer({ storage: localStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
}

export { upload, uploadDonationImage };