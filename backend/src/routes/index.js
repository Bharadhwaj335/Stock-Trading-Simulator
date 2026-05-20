const express = require('express');
const router = express.Router();

const auth = require('./auth.routes');
const trades = require('./trades');
const stocks = require('./stocks');
const portfolio = require('./portfolio');

router.use('/auth', auth);
router.use('/trades', trades);
router.use('/stocks', stocks);
router.use('/portfolio', portfolio);

module.exports = router;
