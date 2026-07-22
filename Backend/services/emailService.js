import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send password reset email
export const sendPasswordResetEmail = async (toEmail, name, resetToken) => {
    const resetLink = `http://127.0.0.1:5500/frontend/reset-password.html?token=${resetToken}`;

    await transporter.sendMail({
        from: `"Aidly Support" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Reset Your Aidly Password",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                <h2 style="color: #166534;">💚 Aidly</h2>
                <h3 style="color: #0f172a;">Password Reset Request</h3>
                <p style="color: #475569;">Hi <strong>${name}</strong>,</p>
                <p style="color: #475569;">We received a request to reset your password. Click the button below to set a new password:</p>
                <a href="${resetLink}" style="display:inline-block; background:#22c55e; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:700; margin: 16px 0;">
                    Reset My Password
                </a>
                <p style="color: #94a3b8; font-size: 13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">Aidly — Connecting Help to Those Who Need It</p>
            </div>
        `,
    });
};

// Send payment confirmation email
export const sendPaymentConfirmationEmail = async (toEmail, name, amount, reference) => {
    await transporter.sendMail({
        from: `"Aidly" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your Donation Payment is Confirmed! 🎉",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                <h2 style="color: #166534;">💚 Aidly</h2>
                <h3 style="color: #0f172a;">Payment Confirmed!</h3>
                <p style="color: #475569;">Hi <strong>${name}</strong>, thank you for your generous donation! 🎉</p>
                <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 600;">AMOUNT DONATED</p>
                    <p style="margin: 4px 0 0; color: #0f172a; font-size: 28px; font-weight: 800;">₵${amount}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Transaction Reference: <strong>${reference}</strong></p>
                <p style="color: #475569;">Your donation is making a real difference in someone's life. You've earned <strong>10 points</strong> on the Aidly leaderboard!</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">Aidly — Connecting Help to Those Who Need It</p>
            </div>
        `,
    });
};

// Send verification approved email
export const sendVerificationApprovedEmail = async (toEmail, name) => {
    await transporter.sendMail({
        from: `"Aidly" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your Aidly Account is Verified! ✅",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                <h2 style="color: #166534;">💚 Aidly</h2>
                <h3 style="color: #0f172a;">Account Verified!</h3>
                <p style="color: #475569;">Hi <strong>${name}</strong>,</p>
                <p style="color: #475569;">Great news! Your Aidly account has been verified by our admin team. You can now browse and request aid items.</p>
                <a href="http://127.0.0.1:5500/frontend/dashboard.html" style="display:inline-block; background:#22c55e; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:700; margin: 16px 0;">
                    Go to Dashboard
                </a>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">Aidly — Connecting Help to Those Who Need It</p>
            </div>
        `,
    });
};

// Send welcome email on registration
export const sendWelcomeEmail = async (toEmail, name, role) => {
    const roleMessages = {
        Donor: "You can now start donating food, clothes, or money to help those in need.",
        Recipient: "Complete your verification by uploading your Ghana Card and proof of need to start requesting aid.",
        Volunteer: "Complete your profile with your phone number and delivery area to get started.",
        Admin: "You have full access to manage users, verify recipients, and monitor donations."
    };

    await transporter.sendMail({
        from: `"Aidly" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Welcome to Aidly! 💚",
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                <h2 style="color: #14532d;">💚 Aidly</h2>
                <h3 style="color: #0f172a;">Welcome, ${name}! 🎉</h3>
                <p style="color: #475569;">Your account has been created successfully as a <strong>${role}</strong>.</p>
                <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0; color: #14532d; font-size: 14px;">${roleMessages[role] || "Welcome to the Aidly community!"}</p>
                </div>
                <a href="http://127.0.0.1:5500/frontend/login.html" style="display:inline-block; background:#22c55e; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:700; margin: 16px 0;">
                    Login to Aidly →
                </a>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">Aidly — Connecting Help to Those Who Need It</p>
            </div>
        `,
    });
};