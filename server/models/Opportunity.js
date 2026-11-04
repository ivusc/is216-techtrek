const mongoose = require('mongoose');

const SOURCE_TYPES = {
  adzuna: ['internship', 'job'],
  devpost: ['hackathon'],
  user: ['hackathon', 'competition'],
  // added by hand from the tracker's "Add application" form, for things found outside TechTrek
  manual: ['job', 'internship', 'hackathon', 'competition'],
};

// sources that have no id in an outside API
const SOURCES_WITHOUT_EXTERNAL_ID = ['user', 'manual'];

const opportunitySchema = new mongoose.Schema(
  {
    source: { type: String, enum: Object.keys(SOURCE_TYPES), required: true },
    externalId: {
      type: String,
      required: function () {
        return !SOURCES_WITHOUT_EXTERNAL_ID.includes(this.source);
      },
    },
    type: {
      type: String,
      enum: Object.values(SOURCE_TYPES).flat(),
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    organisation: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, trim: true, maxlength: 200 },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      required: function () {
        return this.source === 'user';
      },
    },
    // the link is optional when adding by hand
    url: {
      type: String,
      trim: true,
      required: function () {
        return this.source !== 'manual';
      },
    },
    minSalary: { type: Number, min: 0 },
    maxSalary: { type: Number, min: 0 },
    deadline: {
      type: Date,
      required: function () {
        return this.source === 'user';
      },
    },
    maxTeamSize: {
      type: Number,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'maxTeamSize must be a whole number',
      },
    },
    // postedBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: function() {
    //     return this.source === 'user'
    //   }
    // }
  },
  { timestamps: true },
);

opportunitySchema.pre('validate', function () {
  if (this.source && this.type && !SOURCE_TYPES[this.source]?.includes(this.type)) {
    this.invalidate('type', `type '${this.type}' is not allowed for source '${this.source}'`);
  }
  if (this.minSalary != null && this.maxSalary != null && this.maxSalary < this.minSalary) {
    this.invalidate('maxSalary', 'maxSalary must be >= minSalary');
  }
});

// Same Adzuna listing is stored once, however many users save it.
opportunitySchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: 'string' } },
  },
);

opportunitySchema.index({ type: 1, deadline: 1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
