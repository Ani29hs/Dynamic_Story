const express = require("express");
const {
    getPitches,
    createPitch,
    updatePitch,
    deletePitch
} = require("../controllers/pitchController");
const { authMiddleware, adminOnly, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Pitch Routes
router.get("/", authMiddleware, adminOnly, getPitches);          // Admin: Get reader stories / pitches list
router.post("/", optionalAuth, createPitch);                     // User: Submit new pitch
router.patch("/:id", optionalAuth, updatePitch);                 // Admin: Update pitch status (approve/reject)
router.delete("/:id", optionalAuth, deletePitch);                // User / Admin: Delete pitch

module.exports = router;
