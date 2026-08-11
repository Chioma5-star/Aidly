// ─── Environment Detection ────────────────────────────────────────────────────
const isLocal = window.location.hostname === "127.0.0.1" ||
                window.location.hostname === "localhost";

const PROD_BACKEND = "https://aidly-backend.onrender.com";
const LOCAL_BACKEND = "https://aidly-q8i6.onrender.com";

window.BACKEND_URL = isLocal ? LOCAL_BACKEND : PROD_BACKEND;
window.API_URL = `${window.BACKEND_URL}/api`;

// ─── Image URL Helper ─────────────────────────────────────────────────────────
window.imgUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${window.BACKEND_URL}${path}`;
};

// ─── Toast Notification ───────────────────────────────────────────────────────
window.toast = (message, type = "success", duration = 3500) => {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.3s";
        setTimeout(() => el.remove(), 300);
    }, duration);
};

// ─── Spinner Helper ───────────────────────────────────────────────────────────
window.showSpinner = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>`;
};

// ─── Global Fetch with Session Expiry Handling ────────────────────────────────
// Wraps fetch to automatically handle 401 responses
const _originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await _originalFetch(...args);

    // Clone response so we can read it and still return it
    if (response.status === 401) {
        try {
            const clone = response.clone();
            const data = await clone.json();
            if (data.expired) {
                // Clear session and redirect to login
                localStorage.clear();
                // Don't redirect if already on login/register pages
                const currentPage = window.location.pathname;
                const authPages = ["login.html", "register.html", "index.html", "forgot-password.html", "reset-password.html"];
                const isAuthPage = authPages.some(p => currentPage.includes(p));
                if (!isAuthPage) {
                    toast("Your session has expired. Please login again.", "error", 2000);
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                }
            }
        } catch (e) {
            // If JSON parse fails just ignore
        }
    }

    return response;
};

// ─── Session Check on Page Load ───────────────────────────────────────────────
// Check if token exists and hasn't expired client-side
window.checkSession = () => {
    const token = localStorage.getItem("aidlyToken");
    if (!token) return false;

    try {
        // Decode JWT payload (no verification, just check expiry)
        const payload = JSON.parse(atob(token.split(".")[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (isExpired) {
            localStorage.clear();
            return false;
        }
        return true;
    } catch {
        localStorage.clear();
        return false;
    }
};

console.log(`🌐 ${isLocal ? "LOCAL" : "PRODUCTION"} mode | API: ${window.API_URL}`);