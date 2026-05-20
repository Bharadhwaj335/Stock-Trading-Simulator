const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  walletBalance: { type: Number, default: Number(process.env.STARTING_BALANCE) || 30000 },
  avatar: { type: String, default: null },
  bio: { type: String, default: '' },
  isPublic: { type: Boolean, default: true },
  watchlist: [{ type: String }],
  notifyEmail: { type: Boolean, default: false },
  notifyInApp: { type: Boolean, default: true },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  badges: [{ type: String }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  totalPnL: { type: Number, default: 0 },
  totalPnLPercent: { type: Number, default: 0 },
  portfolioValue: { type: Number, default: 0 },
  refreshToken: String,
  rank: { type: Number, default: 0 },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  // To handle any existing plain text passwords gracefully during dev
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    return candidatePassword === this.password;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
