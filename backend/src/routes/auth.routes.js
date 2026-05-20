const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', verifyJWT, ctrl.me);

module.exports = router;
