const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', userController.getUsers);
router.get('/:id', authMiddleware, userController.getUserById);
router.post('/', userController.createUser);
router.patch('/:id', authMiddleware, userController.updateUser);

module.exports = router;
