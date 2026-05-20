const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getLeaderboard, followUser } = require('../controllers/leaderboardController');

const router = Router();

router.get('/', getLeaderboard);
router.post('/:userId/follow', protect, followUser);

module.exports = router;
