const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  symbol: { type: String, required: true },
  companyName: String,
  type: { type: String, enum: ['buy','sell'], required: true },
  qty: { type: Number, required: true, min: 1 },
  priceAtTrade: { type: Number, required: true },
  totalValue: Number,
  pnl: { type: Number, default: null },
  holdingDays: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.models.Trade || mongoose.model('Trade', TradeSchema);
