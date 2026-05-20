const mongoose = require('mongoose');

const TxSchema = new mongoose.Schema({
  type: { type: String, enum: ['buy','sell','topup'], required: true },
  amount: Number,
  description: String,
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: null },
  createdAt: { type: Date, default: Date.now },
});

const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  balance: { type: Number, default: 30000 },
  transactions: [TxSchema],
}, { timestamps: true });

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
