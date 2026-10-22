// API BASE URL — auto-switches between local dev and live cloud production
var API_BASE = window.API_BASE || localStorage.getItem('CUSTOM_API_BASE') || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://dynamic-story-backend.onrender.com"
);
window.API_BASE = API_BASE;