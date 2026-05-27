const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getLeaderboard, followUser, getFeed, getWeekly } = require('../controllers/leaderboardController');

const router = Router();

router.get('/', getLeaderboard);
router.get('/feed', protect, getFeed);
router.get('/weekly', getWeekly);
router.post('/:userId/follow', protect, followUser);

module.exports = router;
