const express = require("express");
const {
    getUsers,
    getUserById,
    createUser,
    updateUser
} = require("../controllers/userController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// User Routes
router.get("/", getUsers);                       // Query users list
router.get("/:id", optionalAuth, getUserById);   // Get user by ID
router.post("/", createUser);                    // Create user
router.patch("/:id", optionalAuth, updateUser);  // Update user profile/XP

module.exports = router;
