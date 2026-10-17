const mongoose = require('mongoose');
const interviewAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  overallScore: {
    type: Number,
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  questions: [
    {
      questionId: {
        type: Number,
        required: true
      },
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      difficulty: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        required: true
      }
    }
  ]
})
module.exports = mongoose.model('interviewAttempt', interviewAttemptSchema);