const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  symbol: { type: String, required: true },
  condition: { type: String, enum: ['ABOVE', 'BELOW'], required: true },
  targetPrice: { type: Number, required: true },
  notifyEmail: { type: Boolean, default: false },
  status: { type: String, enum: ['ACTIVE', 'TRIGGERED', 'DELETED'], default: 'ACTIVE' },
  triggeredAt: { type: Date, default: null },
  triggeredPrice: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);

