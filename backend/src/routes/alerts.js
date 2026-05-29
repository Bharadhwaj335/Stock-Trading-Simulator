const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { createAlert, getAlerts, deleteAlert, updateAlert } = require('../controllers/alertController');

const router = Router();

router.use(protect);
router.post('/', createAlert);
router.get('/', getAlerts);
router.patch('/:id', updateAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
