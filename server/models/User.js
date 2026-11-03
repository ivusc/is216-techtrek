const mongoose = require('mongoose');

// SMU schools a user can pick during onboarding (the client shows the full names)
const FACULTIES = ['SOA', 'LKCSB', 'SCIS', 'SOE', 'YPHSL', 'SOSS', 'CIS'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const OPPORTUNITY_TYPES = ['internship', 'hackathon', 'competition'];
const WORK_TYPES = ['onsite', 'hybrid', 'remote'];

const userSchema = new mongoose.Schema(
  {
    userName : {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [5, 'Username must be at least 5 characters long!'],
      maxlength: [254, 'Username exceeds 254 characters!']
    },
    password : {
      type: String,
      required: true,
      minlength: [8, 'Password must be at least 8 characters long!'],
      maxlength: [70, 'Password exceeds 70 characters!']
    },
    skills : {
      type : [String],
      required: false,
      default : []
    },
    linkedinUrl : {
      type : String,
      default : undefined
    },
    githubUrl : {
      type : String,
      default : undefined
    },
    // filled in by the onboarding steps after sign up
    displayName : {
      type : String,
      trim : true,
      maxlength : [50, 'Name exceeds 50 characters!']
    },
    faculty : {
      type : String,
      enum : { values : FACULTIES, message : 'Please pick an SMU school.' }
    },
    onboarded : {
      type : Boolean,
      default : false
    },
    // profile page
    year : {
      type : Number,
      min : [1, 'Year must be between 1 and 5.'],
      max : [5, 'Year must be between 1 and 5.']
    },
    bio : {
      type : String,
      trim : true,
      maxlength : [300, 'About exceeds 300 characters!']
    },
    // [{ skill: "Vue.js", level: "Advanced" }] - the level shown next to each skill
    // (skills itself stays a plain list for team matching; a list is used because Mongoose map keys can't contain ".")
    skillLevels : {
      type : [{
        _id : false,
        skill : { type : String, required : true, trim : true, maxlength : 40 },
        level : { type : String, enum : SKILL_LEVELS, required : true }
      }],
      default : []
    },
    careerInterests : {
      roles : { type : [String], default : [] },
      opportunityTypes : { type : [String], enum : OPPORTUNITY_TYPES, default : [] },
      workType : { type : String, enum : WORK_TYPES },
      availableFrom : { type : String, match : [/^\d{4}-\d{2}$/, 'Available from must look like 2027-05.'] }
    },
    // "Show me in Teammate Finder"
    openToTeams : {
      type : Boolean,
      default : true
    }
  }
);

module.exports = mongoose.model('User', userSchema);
module.exports.FACULTIES = FACULTIES;
