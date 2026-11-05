const mongoose = require('mongoose');
const InterviewAttempt = require('../models/interviewAttempt');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const ai = require('../ai/gemini-config');
const { questionPrompt, feedbackPrompt } = require('../ai/prompt');

const matchKey = (opportunity) => opportunity.organisation.toLowerCase() + '|' + opportunity.title.toLowerCase()

function summariseQuestions(attempts, titleByApplication) {
  const byId = new Map();
  for (const attempt of attempts) {
    for (const asked of attempt.questions) {
      const seen = byId.get(asked.questionId);
      if (seen) {
        seen.bestScore = Math.max(seen.bestScore, asked.score);
      } else {
        byId.set(asked.questionId, {
          questionId: asked.questionId,
          question: asked.question,
          type: asked.type,
          difficulty: asked.difficulty,
          applicationId: attempt.applicationId,
          title: titleByApplication.get(String(attempt.applicationId)),
          bestScore: asked.score,
        });
      }
    }
  }
  return [...byId.values()];
}

// score trend per role: one point per practice session, oldest first, scored as the session's
// average out of 10 (attempts come in already sorted by completedAt)
function scoreTrends(attempts, titleByApplication) {
  const byTitle = new Map();
  for (const attempt of attempts) {
    const title = titleByApplication.get(String(attempt.applicationId));
    if (!title || attempt.questions.length === 0) continue;
    const total = attempt.questions.reduce((sum, asked) => sum + asked.score, 0);
    const point = { completedAt: attempt.completedAt, score: Math.round((total / attempt.questions.length) * 10) / 10 };
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push(point);
  }
  return [...byTitle].map(([title, points]) => ({ title, points }));
}

async function getInterviewDashboard(req, res) {
  try {
    const userId = req.session.user._id;
    const applications = await Application.find({ userId, status: { $in: ['applied', 'interview'] } });
    const opportunities = await Opportunity.find({
      _id: { $in: applications.map((application) => application.opportunityId) },
      type: { $in: ['job', 'internship'] },
    });
    const opportunityById = new Map(
      opportunities.map((opportunity) => [String(opportunity._id), opportunity]),
    );
    const opportunityOf = (application) => opportunityById.get(String(application.opportunityId));
    const preparing = applications.filter((application) => opportunityOf(application));
    const wanted = preparing.map((application) => matchKey(opportunityOf(application)));
    const titleByApplication = new Map(
      preparing.map((application) => [String(application._id), opportunityOf(application).title]),
    );
    const applicationCards = [];
    for (const application of preparing) {
      const opportunity = opportunityOf(application);
      if (applicationCards.some((card) => card.title === opportunity.title)) continue;
      applicationCards.push({
        applicationId: application._id,
        title: opportunity.title,
        company: opportunity.organisation,
        createdAt: application.createdAt,
        interviewAt: application.interviewAt,
        status: application.status,
      });
    }
    const titles = applicationCards.map((card) => card.title);

    const attempts = await InterviewAttempt.find({
      userId,
      applicationId: { $in: preparing.map((application) => application._id) },
    }).sort({ completedAt: 1, _id: 1 });
    const allQuestions = summariseQuestions(attempts, titleByApplication);
    const trends = scoreTrends(attempts, titleByApplication);
    const highestScore = Math.max(0, ...allQuestions.map((question) => question.bestScore));
    const averageScore = allQuestions.length
      ? (
          allQuestions.reduce((sum, question) => sum + question.bestScore, 0) / allQuestions.length
        ).toFixed(1)
      : 0;

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
      titles,
      allQuestions,
      highestScore,
      averageScore,
      seniorTips,
      trends,
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load interview dashboard'
    })
  }
}
// regex-safe text, so a company name like "C++ Labs" is matched literally
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /interview/tips?organisation=Grab&title=Software Engineer Intern
// anonymous tips from other students who got an offer at this company, for the opportunity's details panel.
// Tips for the same role come first, then the newest.
const MAX_TIPS = 5;
async function getTipsForOpportunity(req, res) {
  const organisation = String(req.query.organisation ?? '').trim();
  const title = String(req.query.title ?? '').trim().toLowerCase();
  if (!organisation) return res.status(400).json({ error: 'organisation is required' });

  try {
    const opportunities = await Opportunity.find({
      organisation: new RegExp(`^${escapeRegex(organisation)}$`, 'i'),
    }).select('_id');
    const shared = await Application.find({
      opportunityId: { $in: opportunities.map((opportunity) => opportunity._id) },
      userId: { $ne: req.session.user._id },
      review: { $exists: true },
    })
      .populate('opportunityId', 'organisation title')
      .sort('-review.createdAt');

    const tips = shared
      .filter((application) => application.opportunityId)
      .map((application) => ({
        organisation: application.opportunityId.organisation,
        title: application.opportunityId.title,
        sameRole: application.opportunityId.title.toLowerCase() === title,
        difficulty: application.review.difficulty,
        rounds: application.review.rounds,
        tips: application.review.tips,
        createdAt: application.review.createdAt,
      }))
      // stable sort: same role first, newest first within each group
      .sort((a, b) => Number(b.sameRole) - Number(a.sameRole))
      .slice(0, MAX_TIPS);

    res.json({ tips });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load tips' });
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
    const { question, type, difficulty } = interviewAttempt.questions.find(
      (asked) => asked.questionId === questionId,
    );
    res.json({ questionId, question, type, difficulty });
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

      contents: questionPrompt(opportunity, existingQuestions),
      config: {
        responseMimeType: 'application/json'
      }
    })

    let questions

    try {
      questions = JSON.parse(response.text)
      // console.log(questions);
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

      contents: feedbackPrompt(opportunity, question, answer),
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
  getTipsForOpportunity,
  getQuestion,
  generateQuestions,
  generateFeedback,
  saveAttempt
}