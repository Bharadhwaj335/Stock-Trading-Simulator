const Wallet = require('../models/Wallet');
const ApiError = require('../utils/ApiError');

async function getOrCreateWallet(userId, session = null) {
  let wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) {
    wallet = await Wallet.create([{ userId, balance: Number(process.env.STARTING_BALANCE) || 30000 }], { session });
    wallet = wallet[0];
  }
  return wallet;
}

async function debit(userId, amount, opts = {}) {
  const session = opts.session || null;
  const wallet = await getOrCreateWallet(userId, session);
  if (wallet.balance < amount) throw new ApiError(400, 'Insufficient funds');
  wallet.balance -= amount;
  wallet.transactions.push({ type: 'buy', amount: -amount, description: opts.description || 'Debit' });
  await wallet.save({ session });
  return wallet;
}

async function credit(userId, amount, opts = {}) {
  const session = opts.session || null;
  const wallet = await getOrCreateWallet(userId, session);
  wallet.balance += amount;
  wallet.transactions.push({ type: opts.type || 'sell', amount, description: opts.description || 'Credit', tradeId: opts.tradeId || null });
  await wallet.save({ session });
  return wallet;
}

module.exports = { getOrCreateWallet, debit, credit };
