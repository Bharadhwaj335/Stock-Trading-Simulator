const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  symbol: String,
  companyName: String,
  qty: Number,
  avgBuyPrice: Number,
  totalInvested: Number,
  firstBoughtAt: Date,
});

const PortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  holdings: [HoldingSchema],
  updatedAt: Date,
});

module.exports = mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);
