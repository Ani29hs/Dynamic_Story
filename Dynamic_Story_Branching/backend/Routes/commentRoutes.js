const express = require("express");
const {
    getComments,
    createComment,
    likeComment,
    updateComment,
    deleteComment
} = require("../controllers/commentController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getComments);                           // Public: read comments (by storyId or all)
router.post("/", optionalAuth, createComment);          // Auth / Body: post comment or reply
router.post("/:id/like", optionalAuth, likeComment);    // Auth: toggle like
router.patch("/:id", optionalAuth, updateComment);      // Auth (author/admin): edit comment
router.delete("/:id", optionalAuth, deleteComment);     // Auth (author/admin): delete comment + replies

module.exports = router;
