const mongoose = require('mongoose');

const STATUS_TYPES = ['pending', 'accepted', 'declined'];
// request: the user asked to join the team; invite: the team leader asked the user to join
const KIND_TYPES = ['request', 'invite'];

const teamRequestSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true, maxlength: 100 },
    message: { type: String, trim: true, maxlength: 500 },
    shareProfile: { type: Boolean, default: true },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'pending' },
    kind: { type: String, enum: KIND_TYPES, required: true, default: 'request' },
    // set when TechTrek closed it, not the people involved: the team filled up, or its closing date passed
    closedReason: { type: String, enum: ['full', 'closed'] },
  },
  { timestamps: true },
);

teamRequestSchema.index({ teamId: 1, userId: 1 }, { unique: true });
teamRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TeamRequest', teamRequestSchema);
