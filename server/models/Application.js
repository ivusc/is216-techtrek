const mongoose = require('mongoose');

const STATUS_TYPES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

// one tick box in the tracker's "Prep checklist"
const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'saved' },
    notes: { type: String, trim: true, maxlength: 2000 },
    deadline: { type: Date },
    interviewAt: { type: Date },
    contactName: { type: String, trim: true, maxlength: 200 },
    // left out until the first save from the detail modal, which fills in the default items;
    // no [] default, so a checklist the user emptied stays empty instead of getting the defaults back
    checklist: { type: [checklistItemSchema], default: undefined },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
