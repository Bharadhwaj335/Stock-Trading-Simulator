const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  symbol: { type: String, required: true },
  condition: { type: String, enum: ['above','below'], required: true },
  targetPrice: { type: Number, required: true },
  notifyEmail: { type: Boolean, default: false },
  triggered: { type: Boolean, default: false },
  triggeredAt: { type: Date, default: null },
  triggeredPrice: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);

