const mongoose = require('mongoose');

/**
 * @typedef {Object} IHolding
 * @property {ObjectId} user
 * @property {string} symbol
 * @property {number} quantity
 * @property {number} avgBuyPrice
 * @property {number} totalInvested
 */

const HoldingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  avgBuyPrice: { type: Number, required: true, default: 0 },
  totalInvested: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.models.Holding || mongoose.model('Holding', HoldingSchema);
