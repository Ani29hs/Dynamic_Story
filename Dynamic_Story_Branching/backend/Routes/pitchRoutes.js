const express = require("express");
const {
    getPitches,
    createPitch,
    updatePitch,
    deletePitch
} = require("../controllers/pitchController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Pitch operations support optional authentication
router.use(optionalAuth);

// Pitch Routes
router.get("/", getPitches);          // Get pitches list
router.post("/", createPitch);        // Submit new pitch
router.patch("/:id", updatePitch);    // Update pitch status (approve/reject)
router.delete("/:id", deletePitch);   // Delete pitch

module.exports = router;
