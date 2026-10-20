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

      if (opportunity && !titles.includes(opportunity.title)) {
        titles.push(opportunity.title)

        applicationCards.push({
          applicationId: application._id,
          title: opportunity.title,
          company: opportunity.organisation,
          createdAt: application.createdAt,
          deadline: application.deadline,
          status: application.status
        })
      }
    }

    const interviewAttempts = await InterviewAttempt.find()
    //     const interviewAttempts = await InterviewAttempt.find({
    //   userId: userId
    // });

    const allQuestions = []
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
          allQuestions.push(q)
        }

        if (!questionScores[q.questionId]) {
          questionScores[q.questionId] = {
            highScore: q.score
          }
        } else if (q.score > questionScores[q.questionId].highScore) {
          questionScores[q.questionId].highScore = q.score
        }
      }
    }

    res.json({
      applicationCards,
      interviewAttempts,
      titles,
      allQuestions,
      questionScores
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',

      contents: prompt(opportunity),
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

    let nextQuestionId = 0

    const latestAttempt = await InterviewAttempt.findOne()
      .sort({ createdAt: -1 })
      //find the last interview attempt entry to determine questionId for the newly generated ones
    if (latestAttempt && latestAttempt.questions.length > 0) {
      const lastQuestion =latestAttempt.questions[latestAttempt.questions.length - 1]
      nextQuestionId = lastQuestion.questionId + 1
    }
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
      model: 'gemini-3.8-flash',

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