const express = require("express");
const {
    getUsers,
    getUserById,
    createUser,
    updateUser
} = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// User Routes
router.get("/", getUsers);                       // Query users list
router.get("/:id", authMiddleware, getUserById); // Get user by ID (auth protected)
router.post("/", createUser);                    // Create user
router.patch("/:id", authMiddleware, updateUser); // Update user profile/XP (auth protected)

module.exports = router;
