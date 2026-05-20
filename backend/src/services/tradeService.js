const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const { debit, credit, getOrCreateWallet } = require('./walletService');
const { getCachedPrice, fetchLivePrice } = require('./priceService');
const ApiError = require('../utils/ApiError');

async function executeTrade({ userId, symbol, type, qty }) {
  if (!['buy','sell'].includes(type)) throw new ApiError(400, 'Invalid trade type');
  if (!qty || qty <= 0) throw new ApiError(400, 'Quantity must be > 0');

  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      // get price (cache or live)
      let priceObj = await getCachedPrice(symbol);
      if (!priceObj) priceObj = await fetchLivePrice(symbol);
      const price = priceObj.price;
      const total = Number((price * qty).toFixed(2));

      if (type === 'buy') {
        // debit wallet
        await debit(userId, total, { session, description: `Buy ${symbol} ${qty}` });

        // update portfolio
        const p = await Portfolio.findOne({ userId }).session(session);
        if (p) {
          const h = p.holdings.find(h => h.symbol === symbol);
          if (h) {
            const newQty = h.qty + qty;
            const newTotalInvested = h.totalInvested + total;
            h.avgBuyPrice = newTotalInvested / newQty;
            h.qty = newQty;
            h.totalInvested = newTotalInvested;
          } else {
            p.holdings.push({ symbol, companyName: symbol, qty, avgBuyPrice: price, totalInvested: total, firstBoughtAt: new Date() });
          }
          await p.save({ session });
        } else {
          await Portfolio.create([{ userId, holdings: [{ symbol, companyName: symbol, qty, avgBuyPrice: price, totalInvested: total, firstBoughtAt: new Date() }] }], { session });
        }

        const trade = await Trade.create([{ userId, symbol, type: 'buy', qty, priceAtTrade: price, totalValue: total }], { session });
        result = { trade: trade[0] };
      } else {
        // SELL
        const p = await Portfolio.findOne({ userId }).session(session);
        if (!p) throw new ApiError(400, 'No holdings');
        const h = p.holdings.find(hh => hh.symbol === symbol);
        if (!h || h.qty < qty) throw new ApiError(400, 'Insufficient holding quantity');

        const pnl = Number(((price - h.avgBuyPrice) * qty).toFixed(2));
        h.qty -= qty;
        h.totalInvested = Number((h.avgBuyPrice * h.qty).toFixed(2));
        if (h.qty <= 0) {
          p.holdings = p.holdings.filter(x => x.symbol !== symbol);
        }
        await p.save({ session });

        await credit(userId, total, { session, type: 'sell', description: `Sell ${symbol} ${qty}` });
        const trade = await Trade.create([{ userId, symbol, type: 'sell', qty, priceAtTrade: price, totalValue: total, pnl }], { session });
        result = { trade: trade[0], pnl };
      }
    });
  } finally {
    session.endSession();
  }
  return result;
}

module.exports = { executeTrade };
