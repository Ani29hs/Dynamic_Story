// API BASE URL — auto-switches between local dev and Railway production
var API_BASE = window.API_BASE || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://dynamicstorybackend-production.up.railway.app"
);
window.API_BASE = API_BASE;