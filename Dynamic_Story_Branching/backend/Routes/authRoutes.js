const express = require("express");
const {
    register,
    login,
    getProfile
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Auth Routes
router.post("/register", register);                  // User signup
router.post("/login", login);                        // User signin
router.get("/profile", authMiddleware, getProfile);  // Get user profile (token protected)

module.exports = router;
