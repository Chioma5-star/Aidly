const API_BASE = "https://aidly-q8i6.onrender.com/api";
const AidlyAPI = {
    getHeaders: () => {
        const token = localStorage.getItem("aidlyToken");
        return {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        };
    },

    get: async (endpoint) => {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: AidlyAPI.getHeaders()
        });
        return await res.json();
    },

    post: async (endpoint, data) => {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: AidlyAPI.getHeaders(),
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // PASTE THE NEW PUT METHOD HERE
    put: async (endpoint, data) => {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "PUT",
                headers: AidlyAPI.getHeaders(),
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (err) {
            console.error("PUT Error:", err);
            throw err;
        }
    }
};