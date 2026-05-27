const Alert = require('../models/Alert');
const Stock = require('../models/Stock');
const { emitToUser } = require('../socket');
const { logger } = require('../utils/logger');

const checkAndFireAlerts = async () => {
  const activeAlerts = await Alert.find({ status: 'ACTIVE' }).populate('user', 'email').lean();
  if (!activeAlerts.length) return;

  const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
  const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
  const priceMap = Object.fromEntries(stocks.map(s => [s.symbol, s.currentPrice]));

  const toTrigger = [];

  for (const alert of activeAlerts) {
    const price = priceMap[alert.symbol];
    if (!price) continue;

    const triggered =
      (alert.condition === 'ABOVE' && price >= alert.targetPrice) ||
      (alert.condition === 'BELOW' && price <= alert.targetPrice);

    if (triggered) {
      toTrigger.push(String(alert._id));

      const userId = alert.user && (alert.user._id ? String(alert.user._id) : String(alert.user));

      if (userId) {
        emitToUser(userId, 'alertTriggered', {
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: price,
        });
      }

      logger.info(`Alert triggered: ${alert.symbol} ${alert.condition} ${alert.targetPrice}`);
    }
  }

  if (toTrigger.length) {
    await Alert.updateMany(
      { _id: { $in: toTrigger } },
      { $set: { status: 'TRIGGERED', triggeredAt: new Date() } }
    );
  }
};

module.exports = {
  checkAndFireAlerts,
};
