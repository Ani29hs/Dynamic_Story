// API BASE URL — auto-switches between local dev and Railway production
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://dynamicstorybackend-production.up.railway.app";