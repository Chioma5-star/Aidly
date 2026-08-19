// config.js - FIXED VERSION

// ─── Environment Detection ────────────────────────────────────────────────────

const hostname = window.location.hostname;

const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1";

const PROD_BACKEND = "https://aidly-q8i6.onrender.com";
const LOCAL_BACKEND = "http://127.0.0.1:5000";

window.BACKEND_URL = isLocal ? LOCAL_BACKEND : PROD_BACKEND;
window.API_URL = `${window.BACKEND_URL}/api`;




window.imgUrl = (path) => {
    if (!path) return "";

    // ✅ FIX: Handle Cloudinary URLs properly
    if (
        path.startsWith("http://") ||
        path.startsWith("https://") ||
        path.startsWith("data:") ||
        path.includes("cloudinary.com")  // ← ADD THIS
    ) {
        return path;
    }

    // ✅ FIX: Remove any leading/trailing slashes issues
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${window.BACKEND_URL}${cleanPath}`;
};


// ─── Toast Notification ───────────────────────────────────────────────────────

window.toast = (message, type = "success", duration = 3500) => {
    const existing = document.querySelector(".toast");

    if (existing) {
        existing.remove();
    }

    const el = document.createElement("div");

    el.className = `toast ${type}`;
    el.textContent = message;

    document.body.appendChild(el);

    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.3s";

        setTimeout(() => {
            el.remove();
        }, 300);
    }, duration);
};


// ─── Spinner Helper ───────────────────────────────────────────────────────────

window.showSpinner = (elementId) => {
    const el = document.getElementById(elementId);

    if (el) {
        el.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
};


// ─── Global Fetch with Session Expiry Handling ────────────────────────────────

// Keep the original browser fetch function
const _originalFetch = window.fetch.bind(window);

window.fetch = async function (...args) {
    try {
        const response = await _originalFetch(...args);

        // Handle expired sessions
        if (response.status === 401) {
            try {
                const clone = response.clone();
                const data = await clone.json();

                if (data.expired) {
                    localStorage.removeItem("aidlyToken");

                    const currentPage = window.location.pathname;

                    const authPages = [
                        "login.html",
                        "register.html",
                        "index.html",
                        "forgot-password.html",
                        "reset-password.html"
                    ];

                    const isAuthPage = authPages.some(
                        page => currentPage.includes(page)
                    );

                    if (!isAuthPage) {
                        window.toast(
                            "Your session has expired. Please login again.",
                            "error",
                            2000
                        );

                        setTimeout(() => {
                            window.location.href = "login.html";
                        }, 2000);
                    }
                }
            } catch (error) {
                // Ignore invalid/non-JSON 401 responses
            }
        }

        return response;

    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};


// ─── Session Check on Page Load ───────────────────────────────────────────────

window.checkSession = () => {
    const token = localStorage.getItem("aidlyToken");

    if (!token) {
        return false;
    }

    try {
        // Decode JWT payload
        const parts = token.split(".");

        if (parts.length !== 3) {
            throw new Error("Invalid JWT format");
        }

        const payload = JSON.parse(atob(parts[1]));

        // Check expiration
        if (!payload.exp || payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("aidlyToken");
            return false;
        }

        return true;

    } catch (error) {
        console.error("Invalid session token:", error);

        localStorage.removeItem("aidlyToken");
        return false;
    }
};


// ─── Debug Information ────────────────────────────────────────────────────────

console.log(
    `🌐 ${isLocal ? "LOCAL" : "PRODUCTION"} mode | Backend: ${window.BACKEND_URL}`
);

console.log(
    `🔗 API: ${window.API_URL}`
);