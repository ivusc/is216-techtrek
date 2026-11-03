const mongoose = require('mongoose');

const STATUS_TYPES = ['pending', 'accepted', 'declined'];

const teamRequestSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true, maxlength: 100 },
    message: { type: String, trim: true, maxlength: 500 },
    shareProfile: { type: Boolean, default: true },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'pending' },
  },
  { timestamps: true },
);

teamRequestSchema.index({ teamId: 1, userId: 1 }, { unique: true });
teamRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TeamRequest', teamRequestSchema);
