const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { createAlert, getAlerts, deleteAlert } = require('../controllers/alertController');

const router = Router();

router.use(protect);
router.post('/', createAlert);
router.get('/', getAlerts);
router.delete('/:id', deleteAlert);

module.exports = router;
