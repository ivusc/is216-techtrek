const mongoose = require('mongoose');
const InterviewAttempt = require('../models/interviewAttempt');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const ai = require('../ai/gemini-config');
const prompt = require('../ai/prompt');

async function getInterviewDashboard(req, res) {
  try {
    const applications = await Application.find()
    //const user = req.session.user;
    //const userId = user._id;
  // const applications = await Application.find({
  //   userId: userId
  // });
    const applicationCards = []
    const titles = []

    for (const application of applications) {
      const opportunity = await Opportunity.findById(
        application.opportunityId
      )
      // add && (application.status = "applied" || application.status == 'interview') to condition once more application data is loaded
      if (opportunity && !titles.includes(opportunity.title) && opportunity.type == "internship" ) {
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

    const interviewAttempts = await InterviewAttempt.find()
    //     const interviewAttempts = await InterviewAttempt.find({
    //   userId: userId
    // });

    const allQuestions = []
    let highestScore = 0
    let averageScore =0
    const questionScores = {}
    for (const attempt of interviewAttempts) {
      for (const q of attempt.questions) {
        let found = false
        for (const existingQuestion of allQuestions) {
          if (existingQuestion.question === q.question) {
            found = true
            break
          }
        }
        if (!found) {
          const data = await getOpportunityFromApplication(attempt.applicationId)
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

    res.json({
      applicationCards,
      interviewAttempts,
      titles,
      allQuestions,
      questionScores,
      highestScore,
      averageScore,
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      error: 'Failed to load interview dashboard'
    })
  }
}
//helper function to get the opportunity from the applicationId
async function getOpportunityFromApplication(applicationId) {
  const application = await Application.findOne({
    _id: applicationId
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
    const  questionId  = req.params.questionId
    const interviewAttempt = await InterviewAttempt.findOne({
      'questions.questionId': questionId
    })
    const applicationId = interviewAttempt.applicationId
    if (!interviewAttempt) {
      return res.status(404).json({
        error: 'Question not found'
      })
    }
    const question = interviewAttempt.questions.find(
      q => q.questionId.toString() === questionId
    )
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
    const data = await getOpportunityFromApplication(
      applicationId
    )

    if (!data) {
      return res.status(404).json({
        error: 'Application or Opportunity not found'
      })
    }

    const opportunity = data.opportunity
    const previousAttempts = await InterviewAttempt.find({
      applicationId: applicationId
    });
    //will also find by userId after that is implemented
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
    const interviewAttempts = await InterviewAttempt.find()
    //after user is implemented it will find by userId
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
      applicationId
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

    const application = await Application.findOne({
      _id: applicationId
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