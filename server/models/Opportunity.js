const mongoose = require('mongoose');

const SOURCE_TYPES = {
  adzuna: ['internship', 'job'],
  devpost: ['hackathon'],
  user: ['hackathon', 'competition'],
};

const opportunitySchema = new mongoose.Schema(
  {
    source: { type: String, enum: Object.keys(SOURCE_TYPES), required: true },
    externalId: {
      type: String,
      required: function () {
        return this.source !== 'user';
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
    url: { type: String, required: true, trim: true },
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
// $type (not $exists) so user posts with no externalId are left out of the index.
opportunitySchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: 'string' } },
  },
);

// Feed: filter by type, sort by deadline
opportunitySchema.index({ type: 1, deadline: 1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
