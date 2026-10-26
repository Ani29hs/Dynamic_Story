const express = require("express");
const {
    getAllStories,
    getStoryById,
    createStory,
    updateStory,
    replaceStory,
    deleteStory,
    incrementStoryViews
} = require("../controllers/storyController");
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Story Routes
router.get("/", authMiddleware, getAllStories);                                     // User: read all stories
router.get("/:id", authMiddleware, getStoryById);                                   // User: read single story
router.post("/:id/view", authMiddleware, adminOnly, incrementStoryViews);           // Admin: increment story read views
router.post("/", authMiddleware, adminOnly, createStory);                           // Admin: create new story
router.patch("/:id", authMiddleware, updateStory);                                  // Auth: update story nodes
router.put("/:id", authMiddleware, adminOnly, replaceStory);                       // Admin: replace story
router.delete("/:id", authMiddleware, adminOnly, deleteStory);                     // Admin: delete story

module.exports = router;
