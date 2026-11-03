const mongoose = require('mongoose');


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
    }
  }
);

module.exports = mongoose.model('User', userSchema);
