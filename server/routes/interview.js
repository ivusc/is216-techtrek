const express = require('express');
const interviewController = require('../controllers/interview-controller');
const router = express.Router();
router.get('/dashboard',interviewController.getInterviewDashboard);
router.get('/tips', interviewController.getTipsForOpportunity);
router.get('/question/:applicationId/:questionId',interviewController.getQuestion)
router.post('/questions',interviewController.generateQuestions)
router.post('/feedback',interviewController.generateFeedback)
router.post( '/attempt',interviewController.saveAttempt)
module.exports = router;