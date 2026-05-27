const User = require('../models/User');
const Trade = require('../models/Trade');
const analyticsService = require('./analyticsService');
const { emitToUser } = require('../socket');

const BADGES = {
  first_trade: {
    id: 'first_trade',
    label: 'First Trade',
    description: 'Executed your very first trade!',
    emoji: '🎯'
  },
  first_profit: {
    id: 'first_profit',
    label: 'First Profit',
    description: 'Closed a trade with positive earnings!',
    emoji: '💰'
  },
  ten_trades: {
    id: 'ten_trades',
    label: 'Active Trader',
    description: 'Executed 10 or more trades!',
    emoji: '🔟'
  },
  win_streak: {
    id: 'win_streak',
    label: 'Hot Streak',
    description: 'Achieved 5 winning trades in a row!',
    emoji: '🔥'
  },
  diversified: {
    id: 'diversified',
    label: 'Diversified',
    description: 'Traded at least 5 different stock symbols!',
    emoji: '🌐'
  },
  big_win: {
    id: 'big_win',
    label: 'Big Winner',
    description: 'Earned over $1,000 in a single trade!',
    emoji: '🚀'
  },
  loss_recovery: {
    id: 'loss_recovery',
    label: 'Comeback Kid',
    description: 'Fully recovered to net positive after a loss of over $500!',
    emoji: '💪'
  }
};

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const stats = await analyticsService.getSummaryStats(userId);
    const trades = await Trade.find({ userId }).sort({ createdAt: 1 }).lean();

    const currentBadges = new Set(user.badges || []);
    const newBadges = [];

    // 1. First Trade
    if (!currentBadges.has('first_trade') && stats.totalTrades >= 1) {
      newBadges.push('first_trade');
    }

    // 2. First Profit
    if (!currentBadges.has('first_profit') && stats.winCount >= 1) {
      newBadges.push('first_profit');
    }

    // 3. Ten Trades
    if (!currentBadges.has('ten_trades') && stats.totalTrades >= 10) {
      newBadges.push('ten_trades');
    }

    // 4. Win Streak (5 consecutive sells with positive PnL)
    if (!currentBadges.has('win_streak')) {
      let currentStreak = 0;
      let maxStreak = 0;
      for (const t of trades) {
        if (t.type === 'sell') {
          if (t.pnl > 0) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        }
      }
      if (maxStreak >= 5) {
        newBadges.push('win_streak');
      }
    }

    // 5. Diversified (traded at least 5 unique symbols)
    if (!currentBadges.has('diversified')) {
      const uniqueSymbols = new Set(trades.map(t => t.symbol));
      if (uniqueSymbols.size >= 5) {
        newBadges.push('diversified');
      }
    }

    // 6. Big Win (PnL >= 1000 in a single trade)
    if (!currentBadges.has('big_win') && stats.bestTrade && stats.bestTrade.pnl >= 1000) {
      newBadges.push('big_win');
    }

    // 7. Loss Recovery (worstTrade pnl < -500, but total realized PnL > 0)
    if (!currentBadges.has('loss_recovery') && stats.worstTrade && stats.worstTrade.pnl <= -500 && stats.totalRealizedPnL > 0) {
      newBadges.push('loss_recovery');
    }

    if (newBadges.length > 0) {
      user.badges = [...currentBadges, ...newBadges];
      await user.save();

      for (const badgeId of newBadges) {
        const badge = BADGES[badgeId];
        emitToUser(userId, 'badge_earned', { badge });
        console.log(`[BadgeService] User ${user.username} earned badge: ${badge.label}`);
      }
    }

    return newBadges;
  } catch (err) {
    console.error('Error checking and awarding badges:', err);
    return [];
  }
};

module.exports = {
  BADGES,
  checkAndAwardBadges
};
