/* =========================================
   1. GLOBAL CONFIG & NAVIGATION
   ========================================= */
const API_URL = "http://127.0.0.1:5000/api";

window.goToRegister = () => { window.location.href = "register.html"; };
window.goToLogin = () => { window.location.href = "login.html"; };
window.logout = () => { localStorage.clear(); window.location.href = "login.html"; };
window.volunteer = () => { window.location.href = "register.html"; };

window.toggleFields = function() {
    const type = document.getElementById("donationType").value;
    const amountField = document.getElementById("amountField");
    const descField = document.getElementById("descriptionField");
    if (type === "money") {
        if (amountField) amountField.style.display = "block";
        if (descField) descField.style.display = "none";
    } else {
        if (amountField) amountField.style.display = "none";
        if (descField) descField.style.display = "block";
    }
};

/* =========================================
   2. AUTHENTICATION
   ========================================= */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const btn = e.target.querySelector("button");
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
            alert("Server offline! Is your backend running on port 5000?");
            btn.innerText = "Login"; btn.disabled = false;
        }
    });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value;
        const email = document.getElementById("regEmail").value;
        const password = document.getElementById("regPassword").value;
        const rawRole = document.querySelector('input[name="role"]:checked').value;
        const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role })
            });
            if (res.ok) { alert("Success! Please Login."); window.location.href = "login.html"; }
            else { const data = await res.json(); alert(data.message || "Registration failed"); }
        } catch (err) { alert("Registration failed. Is your backend running?"); }
    });
}

/* =========================================
   3. DONOR LOGIC
   ========================================= */
window.donate = async function () {
    const token = localStorage.getItem("aidlyToken");
    const user = JSON.parse(localStorage.getItem("aidlyUser"));
    const type = document.getElementById("donationType").value;

    if (!token) return alert("Please login first!");
    if (!type) return alert("Please select a donation type!");

    const payload = { type };

    if (type === "money") {
        const amount = document.getElementById("donationAmount").value;
        if (!amount) return alert("Enter amount");

        const handler = PaystackPop.setup({
            key: 'pk_test_737ee3daade056cbb696c8b56000b2514d759e24',
            email: user.email,
            amount: amount * 100,
            currency: "GHS",
            callback: function(response) {
                payload.amount = amount;
                payload.transactionReference = response.reference;
                saveToDB(payload, token);
            },
            onClose: () => alert("Transaction cancelled")
        });
        handler.openIframe();
    } else {
        payload.description = document.getElementById("donationDescription").value;
        if (!payload.description) return alert("Please enter a description!");
        saveToDB(payload, token);
    }
};

async function saveToDB(payload, token) {
    try {
        const res = await fetch(`${API_URL}/donations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) { alert("Donation Recorded!"); location.reload(); }
        else { const data = await res.json(); alert(data.message || "Failed to save donation"); }
    } catch (err) { alert("Server error while saving donation."); }
}

/* =========================================
   4. RECIPIENT UPLOAD ID + NEEDS ASSESSMENT
   ========================================= */
let selectedIdCard = null;
let selectedProof = null;

window.uploadID = async function() {
    const token = localStorage.getItem("aidlyToken");
    const btn = document.getElementById("uploadBtn");
    const statusEl = document.getElementById("uploadStatus");

    // Validate files
    if (!selectedIdCard) return alert("Please upload your Ghana Card!");
    if (!selectedProof) return alert("Please upload a proof of need document!");

    // Validate needs assessment fields
    const dependents = document.getElementById("dependents")?.value;
    const specificNeed = document.getElementById("specificNeed")?.value;
    const situation = document.getElementById("situation")?.value?.trim();
    const incomeRange = document.getElementById("incomeRange")?.value;

    if (!specificNeed) return alert("Please select your primary need!");
    if (!incomeRange) return alert("Please select your income range!");
    if (!situation) return alert("Please describe your situation!");

    btn.innerText = "Submitting...";
    btn.disabled = true;
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
            alert("✅ Verification request submitted! Admin will review and approve your account.");
            selectedIdCard = null;
            selectedProof = null;
            location.reload();
        } else {
            const data = await res.json();
            if (statusEl) statusEl.innerText = "❌ " + (data.message || "Submission failed");
            alert(data.message || "Submission failed");
            btn.innerText = "Submit Verification Request →";
            btn.disabled = false;
        }
    } catch (err) {
        console.error("Upload error:", err);
        if (statusEl) statusEl.innerText = "❌ Connection error.";
        alert("Connection error. Is your backend running?");
        btn.innerText = "Submit Verification Request →";
        btn.disabled = false;
    }
};

/* =========================================
   5. RECIPIENT: MY REQUESTS
   ========================================= */
window.loadMyRequests = async function() {
    const list = document.getElementById("myRequestsList");
    const token = localStorage.getItem("aidlyToken");

    try {
        const res = await fetch(`${API_URL}/donations/my-requests`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const requests = await res.json();

        if (!requests || requests.length === 0) {
            list.innerHTML = "<p>No active requests found.</p>";
            return;
        }

        list.innerHTML = requests.map(r => `
            <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <h4>📦 ${(r.type || 'ITEM').toUpperCase()}</h4>
                <p>${r.description || ''}</p>
                <p>Status: <strong style="color: ${r.status === 'Approved' ? '#22c55e' : r.status === 'Delivered' ? '#6366f1' : '#f59e0b'}">${r.status || 'Pending'}</strong></p>
                ${r.status === 'Approved' ? `
                    <button onclick="window.markAsReceived('${r._id}')" style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-top: 8px;">
                        ✅ Mark as Received
                    </button>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = "<p style='color: red;'>Error loading your requests.</p>";
    }
};

window.markAsReceived = async function(itemId) {
    const token = localStorage.getItem("aidlyToken");
    try {
        const res = await fetch(`${API_URL}/donations/received/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            alert("✅ Item marked as received!");
            window.loadMyRequests();
        } else {
            const data = await res.json();
            alert(data.message || "Failed to mark as received.");
        }
    } catch (err) { alert("Server error."); }
};

/* =========================================
   6. RECIPIENT: BROWSE AID
   ========================================= */
window.loadAvailableAid = async function() {
    const token = localStorage.getItem("aidlyToken");
    const list = document.getElementById("availableItemsList");
    if (!list) return;

    list.innerHTML = "<p>Loading items...</p>";

    try {
        const res = await fetch(`${API_URL}/donations`, {
            headers: { "Authorization": `Bearer ${token}`, "Cache-Control": "no-cache" }
        });
        const donations = await res.json();

        if (res.ok || res.status === 304) {
            if (!Array.isArray(donations)) throw new Error("Invalid response");
            const items = donations.filter(d => d && d.type && d.type !== 'money');

            list.innerHTML = items.length ? items.map(i => `
                <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${(i.type || 'item').toUpperCase()}</strong>
                        <p style="margin: 5px 0; color: #64748b;">${i.description || 'No description'}</p>
                    </div>
                    <button onclick="requestItem('${i._id}')" style="background: #22c55e; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">Request</button>
                </div>
            `).join('') : "<p style='color: #64748b;'>No items available right now. Check back later!</p>";
        } else {
            list.innerHTML = "<p style='color: red;'>Could not load items.</p>";
        }
    } catch (err) {
        list.innerHTML = "<p style='color: red;'>Error connecting to server.</p>";
    }
};

window.requestItem = async function(itemId) {
    if (!confirm("Are you sure you want to request this item?")) return;
    const token = localStorage.getItem("aidlyToken");
    try {
        const res = await fetch(`${API_URL}/donations/request/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Request sent! The donor will be notified.");
            window.loadAvailableAid();
            window.loadMyRequests();
        } else {
            const data = await res.json();
            alert(data.message || "Failed to request item.");
        }
    } catch (err) { alert("Server error."); }
};

/* =========================================
   7. ACTIVITY HISTORY
   ========================================= */
window.loadDonationHistory = async function() {
    const token = localStorage.getItem("aidlyToken");
    const historyList = document.getElementById("donationHistory");
    if (!historyList || !token) return;

    try {
        const res = await fetch(`${API_URL}/donations/my`, {
            headers: { "Authorization": `Bearer ${token}`, "Cache-Control": "no-cache" }
        });

        if (res.ok || res.status === 304) {
            const donations = await res.json();
            if (!Array.isArray(donations) || donations.length === 0) {
                historyList.innerHTML = "<p style='color: #64748b;'>No activity yet.</p>";
                return;
            }
            historyList.innerHTML = donations.map(d => `
                <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <div>
                        <strong>${(d.type || 'DONATION').toUpperCase()}</strong><br>
                        <small>${d.type === 'money' ? '₵' + d.amount : (d.description || 'No description')}</small>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 11px; color: #94a3b8;">${new Date(d.createdAt || Date.now()).toLocaleDateString()}</span>
                        <span style="color: #22c55e; font-size: 12px; font-weight: bold;">${d.status || 'Pending'}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        historyList.innerHTML = "<p style='color: red;'>Could not load history.</p>";
    }
};

/* =========================================
   8. DASHBOARD INITIALIZATION
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
    } else if (role === "recipient") {
        if (user.isVerified) {
            const rd = document.getElementById("recipientDashboard");
            if (rd) rd.style.display = "block";
            window.loadMyRequests();
        } else {
            const vs = document.getElementById("verificationSection");
            if (vs) {
                vs.style.display = "block";

                // Ghana Card file listener
                const idCardInput = document.getElementById("idCardInput");
                if (idCardInput) {
                    idCardInput.addEventListener("change", function() {
                        selectedIdCard = this.files[0];
                        const nameEl = document.getElementById("idCardName");
                        if (nameEl) nameEl.innerText = selectedIdCard ? `📎 ${selectedIdCard.name}` : "No file chosen";
                    });
                }

                // Proof of Need file listener
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
        window.loadDonationHistory();
    }
});