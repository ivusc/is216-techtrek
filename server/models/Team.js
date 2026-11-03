const mongoose = require('mongoose');

const STATUS_TYPES = ['draft', 'open', 'closed'];

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true, maxlength: 100 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    event: {
      opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
      name: { type: String, required: true, trim: true, maxlength: 200 },
      location: { type: String, trim: true, maxlength: 200 },
    },
    closesAt: { type: Date },

    teamSize: {
      type: Number,
      required: true,
      min: 2,
      max: 10,
      validate: { validator: Number.isInteger, message: 'teamSize must be a whole number' },
    },

    externalMembers: { type: Number, default: 0, min: 0 },

    members: { type: [memberSchema], default: [] },

    pitch: { type: String, required: true, trim: true, maxlength: 300 },
    skills: { type: [String], default: [] },
    autoAccept: { type: Boolean, default: false },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'open' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

teamSchema.virtual('slotsOpen').get(function () {
  return Math.max(0, this.teamSize - this.members.length - this.externalMembers);
});

teamSchema.pre('validate', function () {
  if (this.members.length + this.externalMembers > this.teamSize) {
    this.invalidate('teamSize', 'teamSize is smaller than the number of members already in the team');
  }
});

teamSchema.index({ status: 1, closesAt: 1 });
teamSchema.index({ leaderId: 1 });
teamSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Team', teamSchema);
