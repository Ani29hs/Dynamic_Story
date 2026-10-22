const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSessionById);
router.post('/', sessionController.createSession);
router.patch('/:id', sessionController.updateSession);
router.put('/:id', sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);

module.exports = router;
