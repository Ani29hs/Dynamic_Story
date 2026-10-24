const express = require("express");
const {
    getSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession
} = require("../controllers/sessionController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// All session operations require user authentication
router.use(authMiddleware);

// Story Session Routes
router.get("/", getSessions);             // Get active sessions
router.get("/:id", getSessionById);       // Get session by ID
router.post("/", createSession);          // Create new session
router.patch("/:id", updateSession);      // Update session progress
router.put("/:id", updateSession);        // Replace/update session
router.delete("/:id", deleteSession);     // Delete session

module.exports = router;
