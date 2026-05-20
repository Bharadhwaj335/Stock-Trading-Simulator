const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);
