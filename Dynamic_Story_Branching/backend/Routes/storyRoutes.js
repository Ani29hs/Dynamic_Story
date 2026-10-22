const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, storyController.getAllStories);
router.get('/:id', authMiddleware, storyController.getStoryById);
router.post('/', authMiddleware, adminOnly, storyController.createStory);
router.patch('/:id', authMiddleware, storyController.updateStory);
router.put('/:id', authMiddleware, adminOnly, storyController.replaceStory);
router.delete('/:id', authMiddleware, adminOnly, storyController.deleteStory);

module.exports = router;
