const mongoose = require('mongoose');

// jobs and internships move through job steps; hackathons and competitions have their own steps
const JOB_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];
const EVENT_STATUSES = ['saved', 'registered', 'team', 'submitted', 'results'];
const EVENT_TYPES = ['hackathon', 'competition'];
const STATUS_TYPES = [...new Set([...JOB_STATUSES, ...EVENT_STATUSES])];
// how a finished hackathon went (only for status 'results')
const RESULT_TYPES = ['won', 'finalist', 'participated'];

// the steps allowed for an opportunity type, e.g. statusesFor('hackathon')
function statusesFor(type) {
  return EVENT_TYPES.includes(type) ? EVENT_STATUSES : JOB_STATUSES;
}

// one tick box in the tracker's "Prep checklist"
const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const reviewSchema = new mongoose.Schema(
  {
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'difficulty must be a whole number' },
    },
    rounds: { type: String, trim: true, maxlength: 300 },
    tips: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }, // set when the author edits their tips
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    status: { type: String, enum: STATUS_TYPES, required: true, default: 'saved' },
    result: { type: String, enum: RESULT_TYPES },
    notes: { type: String, trim: true, maxlength: 2000 },
    deadline: { type: Date },
    interviewAt: { type: Date },
    contactName: { type: String, trim: true, maxlength: 200 },
    // left out until the first save from the detail modal, which fills in the default items;
    // no [] default, so a checklist the user emptied stays empty instead of getting the defaults back
    checklist: { type: [checklistItemSchema], default: undefined },
    review: { type: reviewSchema },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.JOB_STATUSES = JOB_STATUSES;
module.exports.EVENT_STATUSES = EVENT_STATUSES;
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.RESULT_TYPES = RESULT_TYPES;
module.exports.statusesFor = statusesFor;
