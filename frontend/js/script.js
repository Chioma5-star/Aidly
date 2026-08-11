/* =========================================
   1. GLOBAL CONFIG & NAVIGATION
   ========================================= */
const API_URL = window.API_URL || "https://aidly-q8i6.onrender.com/api";

window.goToRegister = () => { window.location.href = "register.html"; };
window.goToLogin = () => { window.location.href = "login.html"; };
window.logout = () => { localStorage.clear(); window.location.href = "login.html"; };
window.volunteer = () => { window.location.href = "register.html"; };

window.toggleFields = function() {
    const type = document.getElementById("donationType").value;
    const amountField = document.getElementById("amountField");
    const descField = document.getElementById("descriptionField");
    const expiryField = document.getElementById("expiryField");
    const sizeField = document.getElementById("sizeField");

    if (type === "money") {
        if (amountField) amountField.style.display = "block";
        if (descField) descField.style.display = "none";
        if (expiryField) expiryField.style.display = "none";
        if (sizeField) sizeField.style.display = "none";
    } else {
        if (amountField) amountField.style.display = "none";
        if (descField) descField.style.display = "block";
        if (expiryField) expiryField.style.display = type === "food" ? "block" : "none";
        if (sizeField) sizeField.style.display = type === "clothes" ? "block" : "none";
    }
};

/* =========================================
   2. LOGIN
   ========================================= */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const btn = e.target.querySelector("button[type='submit']") || e.target.querySelector("button");
        btn.innerText = "Logging in..."; btn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("aidlyToken", data.token);
                localStorage.setItem("aidlyUser", JSON.stringify(data.user));
                const role = (data.user.role || "").toLowerCase();
                if (role === "admin") window.location.href = "admin.html";
                else if (role === "volunteer") window.location.href = "volunteer_dashboard.html";
                else window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Login failed");
                btn.innerText = "Login"; btn.disabled = false;
            }
        } catch (err) {
            alert("Cannot connect to server. Is the backend running?");
            btn.innerText = "Login"; btn.disabled = false;
        }
    });
}

/* =========================================
   3. REGISTER
   ========================================= */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const rawRole = document.querySelector('input[name="role"]:checked').value;
        const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

        // Password validation
        if (password.length < 8) return alert("Password must be at least 8 characters!");
        if (!/[A-Z]/.test(password)) return alert("Password must contain at least one uppercase letter!");
        if (!/[0-9]/.test(password)) return alert("Password must contain at least one number!");
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return alert("Password must contain at least one special character!");

        const confirm = document.getElementById("regConfirm")?.value;
        if (confirm !== undefined && confirm !== password) return alert("Passwords do not match!");

        const btn = document.getElementById("registerBtn");
        if (btn) { btn.textContent = "Creating account..."; btn.disabled = true; }

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role })
            });

            if (res.ok) {
                const data = await res.json();
                // Save token and user
                if (data.token) {
                    localStorage.setItem("aidlyToken", data.token);
                    localStorage.setItem("aidlyUser", JSON.stringify(data.user));
                }

                // Volunteers go straight to application page
                if (role === "Volunteer") {
                    window.location.href = "volunteer_application.html";
                    return;
                }

                // Others see success screen
                if (typeof showSuccess === "function") showSuccess(role);
                else {
                    alert("Account created! Please login.");
                    window.location.href = "login.html";
                }
            } else {
                const data = await res.json();
                alert(data.message || "Registration failed");
                if (btn) { btn.textContent = "Create Account"; btn.disabled = false; }
            }
        } catch (err) {
            alert("Registration failed. Is your backend running?");
            if (btn) { btn.textContent = "Create Account"; btn.disabled = false; }
        }
    });
}

/* =========================================
   4. DONOR — DONATE
   ========================================= */
window.donate = async function () {
    const token = localStorage.getItem("aidlyToken");
    const user = JSON.parse(localStorage.getItem("aidlyUser") || "{}");
    const type = document.getElementById("donationType").value;

    if (!token) return alert("Please login first!");
    if (!type) return alert("Please select a donation type!");

    if (type === "money") {
        const amount = document.getElementById("donationAmount").value;
        if (!amount) return alert("Please enter an amount!");

        const handler = PaystackPop.setup({
            key: 'pk_test_737ee3daade056cbb696c8b56000b2514d759e24',
            email: user.email,
            amount: amount * 100,
            currency: "GHS",
            callback: function(response) {
                saveMoneyDonation({ type, amount, transactionReference: response.reference }, token);
            },
            onClose: () => alert("Transaction cancelled")
        });
        handler.openIframe();
    } else {
        const description = document.getElementById("donationDescription").value;
        if (!description) return alert("Please enter a description!");
        savePhysicalDonation(type, description, token);
    }
};

async function saveMoneyDonation(payload, token) {
    try {
        const res = await fetch(`${API_URL}/donations/money`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) { alert("💰 Money donation recorded! Confirmation email sent. Thank you!"); location.reload(); }
        else { const data = await res.json(); alert(data.message || "Failed to save donation"); }
    } catch (err) { alert("Server error while saving donation."); }
}

async function savePhysicalDonation(type, description, token) {
    const imageInput = document.getElementById("donationImageInput");
    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);

    const quantity = document.getElementById("donationQuantity")?.value || 1;
    formData.append("quantity", quantity);

    if (type === "food") {
        const expiry = document.getElementById("donationExpiry")?.value;
        if (expiry) formData.append("expiryDate", expiry);
    }
    if (type === "clothes") {
        const size = document.getElementById("donationSize")?.value;
        if (size) formData.append("size", size);
    }
    if (imageInput && imageInput.files[0]) {
        formData.append("donationImage", imageInput.files[0]);
    }

    try {
        const res = await fetch(`${API_URL}/donations`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        if (res.ok) { alert("✅ Donation recorded! Thank you!"); location.reload(); }
        else { const data = await res.json(); alert(data.message || "Failed to save donation"); }
    } catch (err) { alert("Server error while saving donation."); }
}

/* =========================================
   5. RECIPIENT — UPLOAD ID & NEEDS ASSESSMENT
   ========================================= */
let selectedIdCard = null;
let selectedProof = null;

window.uploadID = async function() {
    const token = localStorage.getItem("aidlyToken");
    const btn = document.getElementById("uploadBtn");
    const statusEl = document.getElementById("uploadStatus");

    if (!selectedIdCard) return alert("Please upload your Ghana Card!");
    if (!selectedProof) return alert("Please upload a proof of need document!");

    const dependents = document.getElementById("dependents")?.value;
    const specificNeed = document.getElementById("specificNeed")?.value;
    const situation = document.getElementById("situation")?.value?.trim();
    const incomeRange = document.getElementById("incomeRange")?.value;

    if (!specificNeed) return alert("Please select your primary need!");
    if (!incomeRange) return alert("Please select your income range!");
    if (!situation) return alert("Please describe your situation!");

    btn.innerText = "Submitting..."; btn.disabled = true;
    if (statusEl) statusEl.innerText = "Uploading documents...";

    const formData = new FormData();
    formData.append("idCard", selectedIdCard);
    formData.append("proofOfNeed", selectedProof);
    formData.append("dependents", dependents || 0);
    formData.append("specificNeed", specificNeed);
    formData.append("situation", situation);
    formData.append("incomeRange", incomeRange);

    try {
        const res = await fetch(`${API_URL}/auth/verify-id`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            if (statusEl) statusEl.innerText = "✅ Submitted! Awaiting admin review.";
            // Update localStorage so pending screen shows
            const currentUser = JSON.parse(localStorage.getItem("aidlyUser") || "{}");
            currentUser.idCardPath = "submitted";
            localStorage.setItem("aidlyUser", JSON.stringify(currentUser));
            // Show pending screen immediately
            const vs = document.getElementById("verificationSection");
            const pv = document.getElementById("pendingVerificationSection");
            if (vs) vs.style.display = "none";
            if (pv) pv.style.display = "block";
            alert("✅ Verification submitted! Awaiting admin review.");
        } else {
            const data = await res.json();
            if (statusEl) statusEl.innerText = "❌ " + (data.message || "Submission failed");
            alert(data.message || "Submission failed");
            btn.innerText = "Submit Verification Request →"; btn.disabled = false;
        }
    } catch (err) {
        if (statusEl) statusEl.innerText = "❌ Connection error.";
        alert("Connection error. Is your backend running?");
        btn.innerText = "Submit Verification Request →"; btn.disabled = false;
    }
};

/* =========================================
   6. RECIPIENT — MY REQUESTS
   ========================================= */
window.loadMyRequests = async function() {
    const list = document.getElementById("myRequestsList");
    const token = localStorage.getItem("aidlyToken");
    if (!list) return;
    list.innerHTML = "<p style='color:#64748b;'>Loading...</p>";

    try {
        const res = await fetch(`${API_URL}/donations/my-requests`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const requests = await res.json();

        if (!requests || requests.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:32px; color:#94a3b8; background:#f8fafc; border-radius:12px; border:1px dashed #e2e8f0;">
                    <div style="font-size:36px; margin-bottom:8px;">📋</div>
                    <p>You haven't requested any items yet.</p>
                    <a href="browse.html" style="display:inline-block; margin-top:12px; background:#14532d; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">Browse Available Items →</a>
                </div>`;
            return;
        }

        list.innerHTML = requests.map(r => `
            <div style="border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px; overflow:hidden; background:white; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                ${r.imagePath ? `<img src="${window.BACKEND_URL || "https://aidly-q8i6.onrender.com/api"}${r.imagePath}" style="width:100%; height:140px; object-fit:cover;" onerror="this.style.display='none'">` : ""}
                <div style="padding:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="margin:0 0 4px; font-size:15px;">📦 ${(r.type || "ITEM").toUpperCase()}</h4>
                            <p style="margin:0 0 6px; color:#64748b; font-size:13px;">${r.description || ""}</p>
                        </div>
                        <span style="padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; background:${r.status === "Approved" ? "#dcfce7" : r.status === "Delivered" ? "#ede9fe" : r.status === "Delivering" ? "#dbeafe" : "#fef3c7"}; color:${r.status === "Approved" ? "#166534" : r.status === "Delivered" ? "#6d28d9" : r.status === "Delivering" ? "#1d4ed8" : "#92400e"}; white-space:nowrap;">
                            ${r.status || "Pending"}
                        </span>
                    </div>
                    ${r.status === "Approved" ? `
                        <button onclick="window.markAsReceived('${r._id}')" style="background:#3b82f6; color:white; border:none; padding:9px 14px; border-radius:8px; cursor:pointer; margin-top:8px; font-weight:600; font-size:13px; width:auto;">
                            ✅ Mark as Received
                        </button>
                    ` : ""}
                </div>
            </div>
        `).join("");
    } catch (err) {
        list.innerHTML = "<p style='color:red;'>Error loading your requests.</p>";
    }
};

window.markAsReceived = async function(itemId) {
    const token = localStorage.getItem("aidlyToken");
    try {
        const res = await fetch(`${API_URL}/donations/received/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
        if (res.ok) { alert("✅ Item marked as received!"); window.loadMyRequests(); }
        else { const data = await res.json(); alert(data.message || "Failed to mark as received."); }
    } catch (err) { alert("Server error."); }
};

/* =========================================
   7. ACTIVITY HISTORY
   ========================================= */
window.loadDonationHistory = async function() {
    const token = localStorage.getItem("aidlyToken");
    const historyList = document.getElementById("donationHistory");
    if (!historyList || !token) return;
    historyList.innerHTML = "<p style='color:#64748b;'>Loading...</p>";

    try {
        const res = await fetch(`${API_URL}/donations/my`, {
            headers: { "Authorization": `Bearer ${token}`, "Cache-Control": "no-cache" }
        });
        if (res.ok) {
            const donations = await res.json();
            if (!Array.isArray(donations) || donations.length === 0) {
                historyList.innerHTML = "<p style='color:#64748b;'>No activity yet.</p>";
                return;
            }
            historyList.innerHTML = donations.map(d => `
                <div style="padding:12px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    ${d.imagePath ? `<img src="${window.BACKEND_URL || ""}${d.imagePath}"style="width:48px; height:48px; object-fit:cover; border-radius:8px; flex-shrink:0;" onerror="this.style.display='none'">` : `<div style="width:48px; height:48px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">${d.type === "money" ? "💰" : d.type === "food" ? "🍱" : "👕"}</div>`}
                    <div style="flex:1;">
                        <strong style="font-size:13px;">${(d.type || "DONATION").toUpperCase()}</strong><br>
                        <small style="color:#64748b;">${d.type === "money" ? "₵" + d.amount : (d.description || "No description")}</small>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <span style="display:block; font-size:11px; color:#94a3b8;">${new Date(d.createdAt || Date.now()).toLocaleDateString()}</span>
                        <span style="font-size:12px; font-weight:700; color:${d.status === "Delivered" ? "#22c55e" : d.status === "available" ? "#3b82f6" : "#f59e0b"};">${d.status || "Pending"}</span>
                    </div>
                </div>
            `).join("");
        }
    } catch (err) {
        historyList.innerHTML = "<p style='color:red;'>Could not load history.</p>";
    }
};

/* =========================================
   8. RECIPIENT DASHBOARD INIT
   ========================================= */
async function initRecipientDashboard() {
    const token = localStorage.getItem("aidlyToken");

    try {
        // Always fetch fresh data from server
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) { window.location.href = "login.html"; return; }

        const freshUser = await res.json();

        // Update localStorage
        const localUser = JSON.parse(localStorage.getItem("aidlyUser") || "{}");
        localStorage.setItem("aidlyUser", JSON.stringify({ ...localUser, ...freshUser, id: freshUser._id }));

        if (freshUser.isVerified) {
            // Verified — show full dashboard
            const rd = document.getElementById("recipientDashboard");
            if (rd) rd.style.display = "block";
            window.loadMyRequests();
        } else if (freshUser.idCardPath) {
            // Submitted but not yet approved — show pending
            const pv = document.getElementById("pendingVerificationSection");
            if (pv) pv.style.display = "block";
        } else {
            // Not submitted yet — show form
            const vs = document.getElementById("verificationSection");
            if (vs) {
                vs.style.display = "block";

                const idCardInput = document.getElementById("idCardInput");
                if (idCardInput) {
                    idCardInput.addEventListener("change", function() {
                        selectedIdCard = this.files[0];
                        const nameEl = document.getElementById("idCardName");
                        if (nameEl) nameEl.innerText = selectedIdCard ? `📎 ${selectedIdCard.name}` : "No file chosen";
                    });
                }

                const proofInput = document.getElementById("proofInput");
                if (proofInput) {
                    proofInput.addEventListener("change", function() {
                        selectedProof = this.files[0];
                        const nameEl = document.getElementById("proofName");
                        if (nameEl) nameEl.innerText = selectedProof ? `📎 ${selectedProof.name}` : "No file chosen";
                    });
                }
            }
        }
    } catch (err) {
        console.error("Recipient init error:", err);
        // Fallback to localStorage
        const localUser = JSON.parse(localStorage.getItem("aidlyUser") || "{}");
        if (localUser.isVerified) {
            const rd = document.getElementById("recipientDashboard");
            if (rd) rd.style.display = "block";
            window.loadMyRequests();
        } else if (localUser.idCardPath) {
            const pv = document.getElementById("pendingVerificationSection");
            if (pv) pv.style.display = "block";
        } else {
            const vs = document.getElementById("verificationSection");
            if (vs) vs.style.display = "block";
        }
    }
}

/* =========================================
   8b. REFRESH POINTS
   ========================================= */
async function refreshPoints() {
    const token = localStorage.getItem("aidlyToken");
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        const freshUser = await res.json();

        // Update localStorage
        const localUser = JSON.parse(localStorage.getItem("aidlyUser") || "{}");
        localUser.points = freshUser.points;
        localStorage.setItem("aidlyUser", JSON.stringify(localUser));

        // Update badge
        const badge = document.getElementById("pointsBadge");
        const pointsEl = document.getElementById("userPoints");
        if (badge && pointsEl) {
            pointsEl.textContent = freshUser.points || 0;
            badge.style.display = freshUser.points > 0 ? "inline-block" : "none";
        }
    } catch {}
}

/* =========================================
   9. DASHBOARD INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    const rawUser = localStorage.getItem("aidlyUser");
    const isDash = window.location.pathname.includes("dashboard.html");

    if (!rawUser && isDash) { window.location.href = "login.html"; return; }
    if (!rawUser) return;

    const user = JSON.parse(rawUser);
    const role = (user.role || "").toLowerCase();

    if (document.getElementById("welcomeText")) {
        document.getElementById("welcomeText").innerText = `Welcome, ${user.name}`;
    }
    if (document.getElementById("userRoleBadge")) {
        document.getElementById("userRoleBadge").innerText = user.role;
        document.getElementById("userRoleBadge").style.display = "inline-block";
    }
    if (document.getElementById("pointsBadge") && user.points > 0) {
        document.getElementById("pointsBadge").style.display = "inline-block";
        document.getElementById("userPoints").innerText = user.points;
    }

    if (role === "admin") {
        window.location.href = "admin.html";
    } else if (role === "volunteer") {
        window.location.href = "volunteer_dashboard.html";
    } else if (role === "donor") {
        const ds = document.getElementById("donorSection");
        if (ds) ds.style.display = "block";
        window.loadDonationHistory();
        // Fetch fresh points from server
        refreshPoints();
    } else if (role === "recipient") {
        initRecipientDashboard();
        window.loadDonationHistory();
    }
});