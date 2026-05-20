const mongoose    = require('mongoose');
const PriceCache  = require('../models/PriceCache');
const Wallet      = require('../models/Wallet');
const Portfolio   = require('../models/Portfolio');
const Trade       = require('../models/Trade');
const priceService = require('./priceService');

/**
 * The core trade execution logic.
 * Takes an optional mongoose session to support transaction atomicity if replica sets are available.
 */
const executeTradeLogic = async (userId, symbol, type, qty, session = null) => {
  const sessionOpt = session ? { session } : {};

  // 1. Get current price from cache
  const priceData    = await priceService.getCachedPrice(symbol);
  const currentPrice = priceData.price;
  const totalValue   = parseFloat((currentPrice * qty).toFixed(2));

  // 2. Get or create wallet
  let wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) {
    wallet = new Wallet({ userId, balance: 30000, transactions: [] });
  }

  // 3. Get or create portfolio document
  let portfolio = await Portfolio.findOne({ userId }).session(session);
  if (!portfolio) {
    portfolio = new Portfolio({ userId, holdings: [] });
  }

  let pnl         = null;
  let holdingDays = null;

  if (type === 'buy') {
    // ── BUY FLOW ──────────────────────────────────────────────────────────
    if (wallet.balance < totalValue) {
      throw new Error(`Insufficient funds. Need $${totalValue.toFixed(2)}, have $${wallet.balance.toFixed(2)}`);
    }

    // Debit wallet
    wallet.balance = parseFloat((wallet.balance - totalValue).toFixed(2));
    wallet.transactions.push({
      type:        'buy',
      amount:      -totalValue,
      description: `Bought ${qty} share${qty > 1 ? 's' : ''} of ${symbol} @ $${currentPrice}`,
    });

    // Update portfolio holdings
    const existingHolding = portfolio.holdings.find((h) => h.symbol === symbol);
    if (existingHolding) {
      // Recalculate weighted average buy price
      const totalShares       = existingHolding.qty + qty;
      const totalCost         = existingHolding.avgBuyPrice * existingHolding.qty + currentPrice * qty;
      existingHolding.avgBuyPrice    = parseFloat((totalCost / totalShares).toFixed(4));
      existingHolding.qty            = totalShares;
      existingHolding.totalInvested  = parseFloat((existingHolding.avgBuyPrice * totalShares).toFixed(2));
    } else {
      portfolio.holdings.push({
        symbol,
        companyName:   priceData.companyName || symbol,
        qty,
        avgBuyPrice:   currentPrice,
        totalInvested: totalValue,
        firstBoughtAt: new Date(),
      });
    }
  } else if (type === 'sell') {
    // ── SELL FLOW ─────────────────────────────────────────────────────────
    const holding = portfolio.holdings.find((h) => h.symbol === symbol);
    if (!holding || holding.qty < qty) {
      throw new Error(`You only own ${holding?.qty || 0} shares of ${symbol}`);
    }

    // Calculate P&L and holding days
    pnl = parseFloat(((currentPrice - holding.avgBuyPrice) * qty).toFixed(2));
    holdingDays = Math.floor(
      (Date.now() - new Date(holding.firstBoughtAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Credit wallet
    wallet.balance = parseFloat((wallet.balance + totalValue).toFixed(2));
    wallet.transactions.push({
      type:        'sell',
      amount:      totalValue,
      description: `Sold ${qty} share${qty > 1 ? 's' : ''} of ${symbol} @ $${currentPrice} (P&L: ${pnl >= 0 ? '+' : ''}$${pnl})`,
    });

    // Update or remove holding
    if (holding.qty === qty) {
      portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== symbol);
    } else {
      holding.qty           -= qty;
      holding.totalInvested  = parseFloat((holding.avgBuyPrice * holding.qty).toFixed(2));
    }
  } else {
    throw new Error('Trade type must be "buy" or "sell"');
  }

  // 4. Create trade record
  const trade = new Trade({
    userId,
    symbol,
    companyName:  priceData.companyName || symbol,
    type,
    qty,
    priceAtTrade: currentPrice,
    totalValue,
    pnl,
    holdingDays,
  });

  // 5. Save everything inside the session (atomic)
  await wallet.save(sessionOpt);
  await portfolio.save(sessionOpt);
  await trade.save(sessionOpt);

  return { trade, newBalance: wallet.balance };
};

/**
 * Executes a BUY or SELL trade.
 * Tries executing inside a session transaction (for production/replica set databases).
 * If MongoDB is running in standalone mode (no replica sets), automatically falls back
 * to non-transactional execution to ensure flawless execution in local developer environments.
 *
 * @param {string} userId
 * @param {string} symbol
 * @param {'buy'|'sell'} type
 * @param {number} qty
 * @returns {{ trade, newBalance }}
 */
const executeTrade = async (userId, symbol, type, qty) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    
    const result = await executeTradeLogic(userId, symbol, type, qty, session);
    
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) { /* ignore */ }
      session.endSession();
    }

    // Check if error is due to MongoDB running in Standalone Mode (no replica set)
    const isStandaloneError = err.message.includes('replica set') || 
                              err.message.includes('Transaction numbers') ||
                              err.codeName === 'IllegalOperation';
    
    if (isStandaloneError) {
      console.warn('[tradeService] MongoDB standalone mode detected. Falling back to non-transactional execution...');
      return await executeTradeLogic(userId, symbol, type, qty, null);
    }
    
    throw err;
  }
};

module.exports = { executeTrade };
