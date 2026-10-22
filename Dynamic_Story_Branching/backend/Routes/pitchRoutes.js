const express = require('express');
const router = express.Router();
const pitchController = require('../controllers/pitchController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', pitchController.getPitches);
router.post('/', pitchController.createPitch);
router.patch('/:id', pitchController.updatePitch);
router.delete('/:id', pitchController.deletePitch);

module.exports = router;
