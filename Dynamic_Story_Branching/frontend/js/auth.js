var Auth = window.Auth || {
    getToken() {
        return localStorage.getItem("token");
    },

    setToken(token) {
        localStorage.setItem("token", token);
    },

    removeToken() {
        localStorage.clear();
    },

    async getProfile() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const res = await fetch(`${API_BASE}/profile`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                this.removeToken();
                return null;
            }
            const data = await res.json();
            return data.user;
        } catch (e) {
            console.error("Auth.getProfile error:", e);
            return null;
        }
    },

    async login(email, password) {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }
        this.setToken(data.token);
        return data;
    },

    async register(name, email, password) {
        const res = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Registration failed");
        }
        return data;
    },

    async requireAuth(requiredRole = null) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        const user = await this.getProfile();
        if (!user) {
            this.logout();
            return null;
        }

        if (requiredRole === "Admin" && user.role !== "Admin") {
            alert("⛔ Access Denied! Admin credentials required.");
            window.location.href = "/pages/reader/stories.html";
            return null;
        }

        if (requiredRole === "Reader" && user.role !== "Reader") {
            alert("⛔ Access Denied! Admin accounts cannot access the Reader Story Library. Please sign in with a Reader account.");
            window.location.href = "/pages/admin/admin.html";
            return null;
        }

        return user;
    },

    authFetch(url, options = {}) {
        const token = this.getToken();
        const headers = Object.assign({}, options.headers || {}, {
            "Authorization": token ? `Bearer ${token}` : ""
        });
        return fetch(url, Object.assign({}, options, { headers }));
    },

    logout() {
        this.removeToken();
        window.location.href = "/pages/auth/login.html";
    }
};

window.Auth = Auth;

// Universal Fetch Interceptor: automatically attaches Bearer token to all requests directed to API_BASE
if (window.fetch && !window.__fetchIntercepted) {
    window.__fetchIntercepted = true;
    const _nativeFetch = window.fetch;
    window.fetch = function(resource, init = {}) {
        try {
            const token = window.Auth ? window.Auth.getToken() : localStorage.getItem("token");
            const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
            if (token && typeof API_BASE !== 'undefined' && url.includes(API_BASE)) {
                init = init || {};
                let headers = init.headers || {};
                if (headers instanceof Headers) {
                    if (!headers.has("Authorization")) {
                        headers.set("Authorization", `Bearer ${token}`);
                    }
                } else if (Array.isArray(headers)) {
                    headers.push(["Authorization", `Bearer ${token}`]);
                } else {
                    if (!headers["Authorization"]) {
                        headers["Authorization"] = `Bearer ${token}`;
                    }
                }
                init.headers = headers;
            }
        } catch (e) {
            console.warn("Fetch interceptor error:", e);
        }
        return _nativeFetch.call(this, resource, init);
    };
}

// Universal Toast Notification System
function showToastNotification(title, message, icon = "🎉", duration = 4500) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-notification-container";
        Object.assign(container.style, {
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: "999999",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            pointerEvents: "none"
        });
        document.body.appendChild(container);
    }

    let toast = document.createElement("div");
    toast.className = "toast-notification-card";
    Object.assign(toast.style, {
        pointerEvents: "auto",
        background: "#ffffff",
        border: "3px solid #000000",
        borderRadius: "18px",
        padding: "14px 20px",
        boxShadow: "6px 6px 0px #000000",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        minWidth: "320px",
        maxWidth: "420px",
        fontFamily: "var(--font-ui, sans-serif)",
        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    });

    toast.innerHTML = `
        <div class="toast-icon" style="font-size: 22px; background: #ffde59; border: 2px solid #000; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${icon}</div>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="font-family: var(--font-display, sans-serif); font-weight: 800; font-size: 14px; color: #000; text-transform: uppercase; line-height: 1.2; margin-bottom: 2px;">${title}</div>
            <div class="toast-message" style="font-weight: 600; font-size: 13px; color: #333; line-height: 1.4;">${message}</div>
        </div>
        <button type="button" class="toast-close-btn" style="background: transparent; border: none; font-size: 22px; font-weight: 800; cursor: pointer; color: #000; padding: 0 4px; line-height: 1;" onclick="this.closest('.toast-notification-card').remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-dismiss after duration
    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        toast.style.opacity = "0";
        toast.style.transform = "translateX(120%) scale(0.9)";
        setTimeout(() => toast.remove(), 350);
    }, duration);
}
window.showToastNotification = showToastNotification;

// Transparently attach JWT Authorization header to all requests to API_BASE
const _originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    options = options || {};
    const token = Auth.getToken();
    if (token && typeof url === "string" && (url.startsWith(API_BASE) || url.startsWith("/"))) {
        options.headers = options.headers || {};
        if (options.headers instanceof Headers) {
            if (!options.headers.has("Authorization")) {
                options.headers.set("Authorization", `Bearer ${token}`);
            }
        } else if (Array.isArray(options.headers)) {
            options.headers.push(["Authorization", `Bearer ${token}`]);
        } else {
            if (!options.headers["Authorization"] && !options.headers["authorization"]) {
                options.headers["Authorization"] = `Bearer ${token}`;
            }
        }
    }
    const response = await _originalFetch(url, options);
    if (response.status === 401 && typeof url === "string" && !url.includes("/login") && !url.includes("/register")) {
        console.warn("Unauthorized API call — redirecting to login:", url);
        Auth.removeToken();
        const p = window.location.pathname;
        if (!p.includes("/login.html") && !p.includes("/signup.html") && !p.endsWith("/Landing.html")) {
            window.location.href = "/pages/auth/login.html";
        }
    }
    return response;
};

// Purge all legacy localStorage keys so ONLY the JWT token remains
(function purgeLegacyStorage() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== "token") {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
})();

