const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [5, 'Username must be at least 5 characters long!'],
      maxlength: [254, 'Username exceeds 254 characters!'],
      match: [/^[^@\s]+@smu\.edu\.sg$/, 'Please use your @smu.edu.sg email.'],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, 'Password must be at least 8 characters long!'],
      maxlength: [70, 'Password exceeds 70 characters!'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required.'],
      trim: true,
      maxlength: [60, 'Display name must be at most 60 characters long.'],
    },
    year: {
      type: Number,
      min: [1, 'Year must be between 1 and 4.'],
      max: [4, 'Year must be between 1 and 4.'],
      validate: { validator: Number.isInteger, message: 'Year must be a whole number.' },
    },
    course: {
      type: String,
      trim: true,
      maxlength: [80, 'Course must be at most 80 characters long.'],
    },
    about: {
      type: String,
      trim: true,
      maxlength: [500, 'About must be at most 500 characters long.'],
    },
    skills: {
      type: [String],
      default: [],
    },
    openToTeams: {
      type: Boolean,
      required: [true, 'Choose whether to show you in Teammate Finder.'],
      default: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
      match: [
        /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{1,100}\/?$/,
        'Use a LinkedIn profile link like https://www.linkedin.com/in/your-name',
      ],
    },
    githubUrl: {
      type: String,
      trim: true,
      match: [
        /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/?$/,
        'Use a GitHub profile link like https://github.com/your-username',
      ],
    },
  },
  {
    toJSON: {
      versionKey: false,
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('User', userSchema);
