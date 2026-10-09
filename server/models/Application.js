const mongoose = require("mongoose");

const STATUS_TYPES = ['saved', 'applied', 'interview', 'offer', 'rejected']

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'saved' },
    notes: { type: String, trim: true, maxlength: 2000 },
    deadline: { type: Date },
    interviewAt: { type: Date },
    contactName: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
