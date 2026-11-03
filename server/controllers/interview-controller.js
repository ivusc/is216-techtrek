const mongoose = require('mongoose');
const InterviewAttempt = require('../models/interviewAttempt');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const ai = require('../ai/gemini-config');
const prompt = require('../ai/prompt');

const matchKey = (opportunity) => opportunity.organisation.toLowerCase() + '|' + opportunity.title.toLowerCase()

async function getInterviewDashboard(req, res) {
  try {
    const userId = req.session.user._id
    const applications = await Application.find({ userId: userId })
    const applicationCards = []
    const titles = []
    const wanted = []

    for (const application of applications) {
      const opportunity = await Opportunity.findById(
        application.opportunityId
      )
      const preparing = opportunity && (opportunity.type === "internship" || opportunity.type === "job") && (application.status === "applied" || application.status === "interview")
      if (preparing) {
        wanted.push(matchKey(opportunity))
      }
      
    if (preparing && !titles.includes(opportunity.title)) {
        titles.push(opportunity.title)

        applicationCards.push({
          applicationId: application._id,
          title: opportunity.title,
          company: opportunity.organisation,
          createdAt: application.createdAt,
          interviewAt:application.interviewAt,
          status: application.status
        })
      }
    }

    const interviewAttempts = await InterviewAttempt.find({ userId: userId })

    const allQuestions = []
    let highestScore = 0
    let averageScore =0
    const questionScores = {}
    for (const attempt of interviewAttempts) {
      for (const q of attempt.questions) {
        const application = await Application.findById(attempt.applicationId)

        if (!application || (application.status !== 'applied' && application.status !== 'interview')) {
          continue
        }
        let found = false
        for (const existingQuestion of allQuestions) {
          if (existingQuestion.question === q.question) {
            found = true
            break
          }
        }
        if (!found) {
          const data = await getOpportunityFromApplication(attempt.applicationId, userId)
          // skip questions whose application was deleted
          if (!data) continue
          allQuestions.push({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            difficulty: q.difficulty,
            score: q.score,
            applicationId: attempt.applicationId,
            title:data.opportunity.title,
          })
        }
        if (!questionScores[q.questionId]) {
          questionScores[q.questionId] = {
            highScore: q.score
          }
          if (q.score > highestScore) {
            highestScore = q.score
          }
        } else if (q.score > questionScores[q.questionId].highScore) {
          questionScores[q.questionId].highScore = q.score
          if (q.score > highestScore) {
            highestScore = q.score
          }
        }
        let totalHighScore = 0
        for (const questionId in questionScores) {
          totalHighScore += questionScores[questionId].highScore
        }
        averageScore =Object.keys(questionScores).length > 0? (totalHighScore / Object.keys(questionScores).length).toFixed(1): 0
      }
    }

    const shared = await Application.find({ userId: { $ne: userId }, review: { $exists: true } })
      .populate('opportunityId')
      .sort('-review.createdAt')
    const seniorTips = shared
      .filter((application) => application.opportunityId && wanted.includes(matchKey(application.opportunityId)))
      .map((application) => ({
        organisation: application.opportunityId.organisation,
        title: application.opportunityId.title,
        difficulty: application.review.difficulty,
        rounds: application.review.rounds,
        tips: application.review.tips,
        createdAt: application.review.createdAt,
      }))

    res.json({
      applicationCards,
      interviewAttempts,
      titles,
      allQuestions,
      questionScores,
      highestScore,
      averageScore,
      seniorTips,
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load interview dashboard'
    })
  }
}
//helper function to get the opportunity from the applicationId
//only finds applications that belong to userId
async function getOpportunityFromApplication(applicationId, userId) {
  if (!mongoose.isValidObjectId(applicationId)) {
    return null
  }
  const application = await Application.findOne({
    _id: applicationId,
    userId: userId
  })

  if (!application) {
    return null
  }
  const opportunity = await Opportunity.findOne({
    _id: application.opportunityId
  })

  if (!opportunity) {
    return null
  }

  return {
    application,
    opportunity
  }
}
//for them to retry the previous questions
async function getQuestion(req, res) {
  try {
    const { applicationId } = req.params;
    const questionId = Number(req.params.questionId);
    if (!mongoose.isValidObjectId(applicationId) || !Number.isInteger(questionId)) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const interviewAttempt = await InterviewAttempt.findOne({
      userId: req.session.user._id,
      applicationId,
      'questions.questionId': questionId,
    });
    if (!interviewAttempt) {
      return res.status(404).json({
        error: 'Question not found'
      })
    }
    const question = interviewAttempt.questions.find((q) => q.questionId === questionId);
    res.json(question)
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load question'
    })
  }
}

async function generateQuestions(req, res) {
  try {
    const { applicationId } = req.body
    
    if (!applicationId) {
      return res.status(400).json({
        error: 'applicationId is required'
      })
    }
    const userId = req.session.user._id
    const data = await getOpportunityFromApplication(
      applicationId,
      userId
    )

    if (!data) {
      return res.status(404).json({
        error: 'Application or Opportunity not found'
      })
    }

    const opportunity = data.opportunity
    const previousAttempts = await InterviewAttempt.find({
      userId: userId,
      applicationId: applicationId
    });
    const existingQuestions = [];
    for (const attempt of previousAttempts) {
      for (const q of attempt.questions) {
        if (q.question && !existingQuestions.includes(q.question)) {
          existingQuestions.push(q.question);
        }
      }
    }
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',

      contents: prompt(opportunity,existingQuestions),
      config: {
        responseMimeType: 'application/json'
      }
    })

    let questions

    try {
      questions = JSON.parse(response.text)
      console.log(questions);
    } catch {
      return res.status(500).json({
        error: 'Invalid AI response'
      })
    }
    if (
      !Array.isArray(questions) || questions.length !== 5
    ) {
      return res.status(500).json({
        error: 'AI failed to generate 5 valid questions'
      })
    }
    // question ids are shared by every user, so look at all attempts to find the next free id
    const interviewAttempts = await InterviewAttempt.find()
    let maxQuestionId = 0

    for (const attempt of interviewAttempts) {
      for (const q of attempt.questions) {
        if (q.questionId > maxQuestionId) {
          maxQuestionId = q.questionId
        }
      }
    }

    const nextQuestionId = maxQuestionId + 1
    const questionsWithIds = []
    for (let i = 0; i < questions.length; i++) {
      questionsWithIds.push({
        questionId: nextQuestionId + i,
        question: questions[i].question,
        type: questions[i].type,
        difficulty: questions[i].difficulty
      })
    }

    res.json({
      questions: questionsWithIds
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Failed to generate interview questions'
    })
  }
}

async function generateFeedback(req, res) {
  try {
    const {
      applicationId,
      question,
      answer
    } = req.body

    if (!applicationId || !question || !answer) {
      return res.status(400).json({
        error: 'applicationId, question and answer are required'
      })
    }
    const data = await getOpportunityFromApplication(
      applicationId,
      req.session.user._id
    )
    if (!data) {
      return res.status(404).json({
        error: 'Application or Opportunity not found'
      })
    }

    const opportunity = data.opportunity

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',

      contents: `
You are evaluating a candidate's interview answer.

Organisation: ${opportunity.organisation}
Role: ${opportunity.title}
Type: ${opportunity.type}

Description:
${opportunity.description || 'No description provided'}

Interview Question:
${question}

Candidate Answer:
${answer}

Evaluate the candidate's answer based on:

1. Structure
- Is the answer organised and easy to follow?

2. Clarity
- Is the answer clear and understandable?

3. Relevance
- Does the answer address the question?

4. Impact
- Are outcomes, results and achievements demonstrated?

Give each category a score from 0 to 10.

Also provide:
- An overall score from 0 to 10
- A short summary
- A short overall evaluation
- Exactly 2 strengths
- Exactly 2 specific improvements
- A stronger version of the answer

Return JSON in this format:

{
  "score": 0,
  "summary": "",
  "overallFeedback": "",
  "structure": 0,
  "clarity": 0,
  "relevance": 0,
  "impact": 0,
  "strengths": [],
  "improvements": [],
  "sampleAnswer": ""
}
`,
      config: {
        responseMimeType: 'application/json'
      }
    })

    let feedback

    try {
      feedback = JSON.parse(response.text)
    } catch {
      return res.status(500).json({
        error: 'Invalid AI response'
      })
    }
    if (
      typeof feedback?.score !== 'number' ||
      !Array.isArray(feedback.strengths) ||
      !Array.isArray(feedback.improvements)
    ) {
      return res.status(500).json({ error: 'Invalid AI response' });
    }
    res.json({
      feedback
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to generate feedback'
    })
  }
}

async function saveAttempt(req, res) {
  try {
    const {applicationId, questions} = req.body

    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        error: 'Invalid applicationId'
      })
    }
    const application = await Application.findOne({
      _id: applicationId,
      userId: req.session.user._id
    })
    if (!questions ||!Array.isArray(questions) ||questions.length === 0) {
      return res.status(400).json({
        error: 'No questions to save'
      })
    }

    if (!application) {
      return res.status(404).json({
        error: 'Application not found'
      })
    }

    const interviewAttempt =
      await InterviewAttempt.create({
        userId: application.userId,
        applicationId,
        questions
      })

    res.status(201).json(interviewAttempt)
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.log(error)

    res.status(500).json({
      error: 'Failed to save interview attempt'
    })
  }
}

module.exports = {
  getInterviewDashboard,
  getQuestion,
  generateQuestions,
  generateFeedback,
  saveAttempt
}