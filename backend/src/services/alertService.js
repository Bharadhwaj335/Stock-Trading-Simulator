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

  console.log(`[Alert Service] Evaluating ${activeAlerts.length} active alerts...`);

  for (const alert of activeAlerts) {
    const price = priceMap[alert.symbol];
    if (!price) {
      console.log(`[Alert Service] Price missing for symbol ${alert.symbol}, skipping.`);
      continue;
    }

    const triggered =
      (alert.condition === 'ABOVE' && price >= alert.targetPrice) ||
      (alert.condition === 'BELOW' && price <= alert.targetPrice);

    console.log(`[Alert Service] Checking alert ${alert._id}: ${alert.symbol} current=$${price} target=$${alert.targetPrice} cond=${alert.condition} triggered=${triggered}`);

    if (triggered) {
      toTrigger.push(String(alert._id));

      const userId = alert.user && (alert.user._id ? String(alert.user._id) : String(alert.user));
      const email = alert.user && alert.user.email;

      if (userId) {
        emitToUser(userId, 'alertTriggered', {
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: price,
        });
      }

      // Check if user requested email notification
      if (alert.notifyEmail && email) {
        console.log(`[Alert Service] Alert triggered! Attempting to send email notification to ${email}...`);
        const { sendEmail } = require('./emailService');
        sendEmail({
          to: email,
          subject: `🔔 StockSim Alert Triggered: ${alert.symbol}`,
          text: `Your price target has been breached!\n\nStock: ${alert.symbol}\nCondition: ${alert.condition}\nTarget: $${alert.targetPrice.toFixed(2)}\nTriggered Price: $${price.toFixed(2)}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #020617; color: #f8fafc;">
              <h2 style="color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-top: 0;">🔔 StockSim Alert Triggered</h2>
              <p>Hi there,</p>
              <p>Your price monitor has successfully breached its target threshold:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #0f172a;">
                  <td style="padding: 10px; border: 1px solid #1e293b; font-weight: bold;">Stock Symbol</td>
                  <td style="padding: 10px; border: 1px solid #1e293b; font-family: monospace; color: #38bdf8;">${alert.symbol}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #1e293b; font-weight: bold;">Condition</td>
                  <td style="padding: 10px; border: 1px solid #1e293b; color: ${alert.condition === 'ABOVE' ? '#10b981' : '#f43f5e'}; font-weight: bold;">${alert.condition}</td>
                </tr>
                <tr style="background-color: #0f172a;">
                  <td style="padding: 10px; border: 1px solid #1e293b; font-weight: bold;">Target Price</td>
                  <td style="padding: 10px; border: 1px solid #1e293b; font-family: monospace;">$${alert.targetPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #1e293b; font-weight: bold;">Triggered Price</td>
                  <td style="padding: 10px; border: 1px solid #1e293b; font-family: monospace; font-weight: bold; color: #10b981;">$${price.toFixed(2)}</td>
                </tr>
              </table>
              <p>Sign in to your StockSim account to see more or manage your monitors.</p>
            </div>
          `
        })
        .then(() => console.log(`[Alert Service] Trigger email successfully queued/sent to ${email}`))
        .catch(err => logger.error(`SMTP/API Trigger send failed: ${err.message}`));
      } else {
        console.log(`[Alert Service] Alert triggered, but notifyEmail=${alert.notifyEmail} and email=${email || 'none'}. Skipping email.`);
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
