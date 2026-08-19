/* =========================================
   1. GLOBAL CONFIG & NAVIGATION
   ========================================= */
const API_URL = window.API_URL || "https://aidly-q8i6.onrender.com/api";

// ✅ NEW: Helper function for getting correct image URLs
window.getImageUrl = (path) => {
    if (!path) return "";
    
    // If it's already a complete URL, return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    
    // If it's a Cloudinary URL without http (shouldn't happen, but just in case)
    if (path.includes("cloudinary.com") || path.includes("res.cloudinary")) {
        return path.startsWith("//") ? `https:${path}` : `https://${path.replace(/^\/+/, '')}`;
    }
    
    // For local files, add the backend URL
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${window.BACKEND_URL || "https://aidly-q8i6.onrender.com"}${cleanPath}`;
};

window.goToRegister = () => { window.location.href = "register.html"; };
window.goToLogin = () => { window.location.href = "login.html"; };
window.logout = () => { localStorage.clear(); window.location.href = "login.html"; };
window.volunteer = () => { window.location.href = "register.html"; };

// ... rest of your existing code ...

/* =========================================
   6. RECIPIENT — MY REQUESTS (FIXED)
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
                ${r.imagePath ? `<img src="${window.getImageUrl(r.imagePath)}" style="width:100%; height:140px; object-fit:cover;" onerror="this.style.display='none'">` : ""}
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

/* =========================================
   7. ACTIVITY HISTORY (FIXED)
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
                    ${d.imagePath ? `<img src="${window.getImageUrl(d.imagePath)}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; flex-shrink:0;" onerror="this.style.display='none'">` : `<div style="width:48px; height:48px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">${d.type === "money" ? "💰" : d.type === "food" ? "🍱" : "👕"}</div>`}
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

// ... rest of your code remains the same ...