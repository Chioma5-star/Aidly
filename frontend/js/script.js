/* =========================================
   1. GLOBAL CONFIG & NAVIGATION
   ========================================= */
const API_URL = "http://127.0.0.1:5000/api";

window.goToRegister = () => { window.location.href = "register.html"; };
window.goToLogin = () => { window.location.href = "login.html"; };
window.logout = () => { localStorage.clear(); window.location.href = "login.html"; };

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
                window.location.href = "dashboard.html";
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
   4. RECIPIENT UPLOAD ID
   ========================================= */
let selectedFile = null;

window.uploadID = async function() {
    const token = localStorage.getItem("aidlyToken");
    const btn = document.getElementById("uploadBtn");

    if (!selectedFile) return alert("Please select a file first!");
    if (!btn) return console.error("uploadBtn not found!");

    btn.innerText = "Uploading...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append("idCard", selectedFile);

    try {
        const res = await fetch(`${API_URL}/auth/verify-id`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            alert(" ID Uploaded successfully! Please wait for admin verification.");
            selectedFile = null;
            location.reload();
        } else {
            const data = await res.json();
            alert(data.message || "Upload failed");
            btn.innerText = "Upload ID Card";
            btn.disabled = false;
        }
    } catch (err) {
        alert("Connection error. Is your backend running?");
        btn.innerText = "Upload ID Card";
        btn.disabled = false;
    }
};

/* =========================================
   5. RECIPIENT: BROWSE AID
   ========================================= */
window.loadAvailableAid = async function() {
    const list = document.getElementById("availableItemsList");
    if (!list) return;

    try {
        // Use the centralized API tool instead of raw fetch
        const donations = await AidlyAPI.get("/donations");
        
        // Filter out money donations to show physical items
        const items = donations.filter(d => d.type && d.type !== 'money');
        
        if (items.length === 0) {
            list.innerHTML = "<p>No physical items available at the moment.</p>";
            return;
        }

        list.innerHTML = items.map(i => `
            <div class="aid-card">
                <div class="aid-info">
                    <strong>${(i.type || 'unknown').toUpperCase()}</strong>
                    <p>${i.description}</p>
                </div>
<button onclick="requestItem('${i._id}')" class="btn-request">Request</button>
            </div>
        `).join('');
    } catch (err) {
        console.error("Load Aid Error:", err);
        list.innerHTML = "<p class='error-text'>Error connecting to the server. Please try again later.</p>";
    }
};

/* =========================================
   6. ACTIVITY HISTORY
   ========================================= */
window.loadDonationHistory = async function() {
    const token = localStorage.getItem("aidlyToken");
    const historyList = document.getElementById("donationHistory");
    if (!historyList || !token) return;

    try {
        const res = await fetch(`${API_URL}/donations/my`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Cache-Control": "no-cache"
            }
        });

        if (res.ok || res.status === 304) {
            const donations = await res.json();
            if (donations.length === 0) {
                historyList.innerHTML = "<p style='color: #64748b;'>No activity yet.</p>";
                return;
            }
            historyList.innerHTML = donations.map(d => `
                <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <div>
                        <strong>${d.type.toUpperCase()}</strong><br>
                        <small>${d.type === 'money' ? '₵' + d.amount : (d.description || 'No description')}</small>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 11px; color: #94a3b8;">${new Date(d.createdAt).toLocaleDateString()}</span>
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
   7. DASHBOARD INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    const rawUser = localStorage.getItem("aidlyUser");
    if (!rawUser) return;

    const user = JSON.parse(rawUser);
    const role = (user.role || "User").toLowerCase();

    // 1. Update Welcome Text
    const nameEl = document.getElementById("welcomeText");
    if (nameEl) nameEl.innerText = `Welcome, ${user.name}`;

    // 2. Update & Show Role Badge
    const badge = document.getElementById("userRoleBadge");
    if (badge) {
        badge.innerText = role.toUpperCase();
        badge.style.display = "inline-block";
        
        // Color coding
        if (role === 'admin') badge.style.backgroundColor = "#dbeafe";
        else if (role === 'donor') badge.style.backgroundColor = "#fef3c7";
        else if (role === 'recipient') badge.style.backgroundColor = "#dcfce7";
    }

    // 3. Role-Specific Section Visibility
    if (role === "admin") {
        // (Your existing admin logic here)
    } 
    else if (role === "donor") {
        const ds = document.getElementById("donorSection");
        if (ds) ds.style.display = "block";

        // Show Points Badge for Donors
        const pb = document.getElementById("pointsBadge");
        const pt = document.getElementById("userPoints");
        if (pb && pt) {
            pb.style.display = "inline-block";
            pt.innerText = user.points || 0;
        }
    }
    else if (role === "recipient") {
    const statusText = document.getElementById("uploadStatus"); // Make sure this ID is in your HTML
    
    if (user.isVerified) {
        document.getElementById("recipientDashboard").style.display = "block";
        if (statusText) statusText.innerHTML = "✅ Account Verified";
    } else if (user.idCardPath) {
        document.getElementById("verificationSection").style.display = "block";
        if (statusText) statusText.innerHTML = "⏳ Verification Pending (Admin is reviewing your ID)";
    } else {
        document.getElementById("verificationSection").style.display = "block";
        if (statusText) statusText.innerHTML = "❌ ID Required: Please upload your Ghana Card.";
    }
}

    window.loadDonationHistory();
});

/* =========================================
   8. RECIPIENT MANAGEMENT (Global Functions)
   ========================================= */
window.loadMyRequests = async function() {
    const list = document.getElementById("myRequestsList");
    if (!list) return;

    try {
        const requests = await AidlyAPI.get("/donations/my-requests");
        if (requests.length === 0) {
            list.innerHTML = "<p>You haven't requested any items yet.</p>";
            return;
        }

        list.innerHTML = requests.map(r => `
            <div class="request-card">
                <h4>📦 ${r.type.toUpperCase()}</h4>
                <p>Status: <strong style="color: ${r.status === 'Delivered' ? '#64748b' : '#22c55e'}">${r.status}</strong></p>
                
                ${r.status === 'Approved' ? `
                    <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                        <p><strong>Donor:</strong> ${r.user ? r.user.name : 'Donor'}</p>
                        <button onclick="confirmReceipt('${r._id}')" class="btn-approve" style="background: #3b82f6; width:100%; margin-top:10px;">
                            Mark as Received
                        </button>
                    </div>
                ` : ''}

                ${r.status === 'Delivered' ? `
                    <p style="color: #64748b; font-size: 12px; font-style: italic; margin-top: 10px;">
                        Collected on ${new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading requests:", err);
    }
};

window.confirmReceipt = async function(id) {
    if (!confirm("Confirm you have received this item?")) return;
    try {
        await AidlyAPI.put(`/donations/received/${id}`, {});
        alert("Awesome! Status updated to Delivered.");
        window.loadMyRequests(); 
    } catch (err) {
        alert("Failed to update status.");
    }
};