const express = require("express");
const {
    getReviews,
    createOrUpdateReview,
    deleteReview
} = require("../controllers/reviewController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getReviews);                            // Public: read reviews (filtered by storyId or all)
router.post("/", optionalAuth, createOrUpdateReview);   // Auth / Body: create or update review
router.delete("/:id", optionalAuth, deleteReview);      // Auth (author/admin): delete review

module.exports = router;
