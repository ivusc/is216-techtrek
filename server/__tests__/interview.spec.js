import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';
import { failGemini, stubGemini } from './helpers/upstream.js';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const InterviewAttempt = require('../models/interviewAttempt');

const ME = 'kellie.jubela@smu.edu.sg';
const OTHER = 'someone.else@smu.edu.sg';

const FIVE_QUESTIONS = [
  { question: 'Tell me about a Vue project you shipped.', type: 'Behavioural', difficulty: 'Easy' },
  { question: 'How does Vue track reactive state?', type: 'Technical', difficulty: 'Medium' },
  {
    question: 'Design a job board for a traffic spike.',
    type: 'System Design',
    difficulty: 'Hard',
  },
  {
    question: 'How would you grow sign-ups for a student app?',
    type: 'Case',
    difficulty: 'Medium',
  },
  {
    question: 'Describe a time you disagreed with a teammate.',
    type: 'Behavioural',
    difficulty: 'Easy',
  },
];

const SCORED = FIVE_QUESTIONS.map((question, index) => ({
  ...question,
  questionId: index + 1,
  score: index + 5,
}));

const FEEDBACK = {
  score: 7,
  summary: 'Clear and relevant',
  overallFeedback: 'Well organised, light on outcomes.',
  structure: 8,
  clarity: 7,
  relevance: 8,
  impact: 5,
  strengths: ['Clear structure', 'Relevant example'],
  improvements: ['Quantify the outcome', 'Name your own part'],
  sampleAnswer: 'I led the Vue rewrite of our club site and cut load time by half.',
};

async function idOf(userName) {
  return String((await User.findOne({ userName }))._id);
}

async function saveAttempt(agent, applicationId, questions = SCORED) {
  const response = await agent
    .post('/interview/attempt')
    .send({ applicationId, questions })
    .expect(201);
  return response.body;
}

function anotherUsersAttempt(applicationId, question) {
  return InterviewAttempt.create({
    userId: new mongoose.Types.ObjectId(),
    applicationId,
    questions: [question],
  });
}

describe('POST /interview/questions', () => {
  it('asks Gemini about the opportunity and numbers the questions after the highest existing id', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await anotherUsersAttempt(new mongoose.Types.ObjectId(), { ...SCORED[0], questionId: 7 });
    const generate = stubGemini(JSON.stringify(FIVE_QUESTIONS));

    const response = await agent
      .post('/interview/questions')
      .send({ applicationId: application._id })
      .expect(200);

    expect(response.body.questions).toEqual(
      FIVE_QUESTIONS.map((question, index) => ({ ...question, questionId: 8 + index })),
    );
    expect(generate).toHaveBeenCalledTimes(1);
    const [{ contents, config }] = generate.mock.calls[0];
    expect(config.responseMimeType).toBe('application/json');
    expect(contents).toContain('Acme');
    expect(contents).toContain('Frontend Intern');
  });

  it("passes this user's previous questions to the prompt", async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    const otherRole = await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Data Intern' }),
    });
    await saveAttempt(agent, application._id, [SCORED[0]]);
    await saveAttempt(agent, otherRole._id, [SCORED[2]]);
    await anotherUsersAttempt(application._id, { ...SCORED[1], questionId: 9 });
    const generate = stubGemini(JSON.stringify(FIVE_QUESTIONS));

    await agent.post('/interview/questions').send({ applicationId: application._id }).expect(200);

    const [{ contents }] = generate.mock.calls[0];
    expect(contents).toContain(SCORED[0].question);
    expect(contents).not.toContain(SCORED[1].question);
    expect(contents).not.toContain(SCORED[2].question);
  });

  it('persists nothing', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    stubGemini(JSON.stringify(FIVE_QUESTIONS));

    await agent.post('/interview/questions').send({ applicationId: application._id }).expect(200);

    expect(await InterviewAttempt.countDocuments()).toBe(0);
  });

  it.each([
    ['no applicationId', () => ({}), 400, 'applicationId is required'],
    [
      'a malformed applicationId',
      () => ({ applicationId: 'nope' }),
      404,
      'Application or Opportunity not found',
    ],
    [
      "another user's application",
      (theirs) => ({ applicationId: theirs }),
      404,
      'Application or Opportunity not found',
    ],
  ])('rejects %s', async (label, body, status, message) => {
    const agent = await loginAs(app, { userName: ME });
    const theirs = await saveApplication(await loginAs(app, { userName: OTHER }));
    const generate = stubGemini(JSON.stringify(FIVE_QUESTIONS));

    const response = await agent.post('/interview/questions').send(body(theirs._id)).expect(status);

    expect(response.body).toEqual({ error: message });
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ['text that is not JSON', () => stubGemini('not json'), 'Invalid AI response'],
    ['an empty list', () => stubGemini('[]'), 'AI failed to generate 5 valid questions'],
    [
      'four questions',
      () => stubGemini(JSON.stringify(FIVE_QUESTIONS.slice(0, 4))),
      'AI failed to generate 5 valid questions',
    ],
    ['an error', () => failGemini(), 'Failed to generate interview questions'],
  ])('answers 500 when the AI returns %s', async (label, answer, message) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    answer();

    const response = await agent
      .post('/interview/questions')
      .send({ applicationId: application._id })
      .expect(500);

    expect(response.body).toEqual({ error: message });
  });
});

describe('POST /interview/feedback', () => {
  it("returns Gemini's feedback for the answer", async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    const generate = stubGemini(JSON.stringify(FEEDBACK));

    const response = await agent
      .post('/interview/feedback')
      .send({
        applicationId: application._id,
        question: SCORED[0].question,
        answer: 'I rebuilt our club site in Vue.',
      })
      .expect(200);

    expect(response.body).toEqual({ feedback: FEEDBACK });
    const [{ contents }] = generate.mock.calls[0];
    expect(contents).toContain(SCORED[0].question);
    expect(contents).toContain('I rebuilt our club site in Vue.');
  });

  it.each(['applicationId', 'question', 'answer'])('answers 400 without %s', async (missing) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    const generate = stubGemini(JSON.stringify(FEEDBACK));
    const body = { applicationId: application._id, question: SCORED[0].question, answer: 'I did.' };
    delete body[missing];

    const response = await agent.post('/interview/feedback').send(body).expect(400);

    expect(response.body).toEqual({ error: 'applicationId, question and answer are required' });
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ['no score', { summary: 'x' }],
    ['a score that is not a number', { ...FEEDBACK, score: '7' }],
    ['strengths that are not a list', { ...FEEDBACK, strengths: 'Clear structure' }],
    ['no improvements', { ...FEEDBACK, improvements: undefined }],
  ])('rejects feedback with %s', async (label, feedback) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    stubGemini(JSON.stringify(feedback));

    const response = await agent
      .post('/interview/feedback')
      .send({ applicationId: application._id, question: SCORED[0].question, answer: 'I did.' })
      .expect(500);

    expect(response.body).toEqual({ error: 'Invalid AI response' });
  });
});

describe('POST /interview/attempt', () => {
  it('saves the attempt with its scored questions', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);

    const saved = await saveAttempt(agent, application._id);

    const attempt = await InterviewAttempt.findById(saved._id);
    expect(String(attempt.userId)).toBe(await idOf(ME));
    expect(String(attempt.applicationId)).toBe(application._id);
    expect(attempt.questions.map((question) => question.score)).toEqual([5, 6, 7, 8, 9]);
  });

  it.each([
    [
      'a malformed applicationId',
      () => ({ applicationId: 'nope', questions: SCORED }),
      400,
      'Invalid applicationId',
    ],
    [
      'no questions',
      (mine) => ({ applicationId: mine, questions: [] }),
      400,
      'No questions to save',
    ],
    [
      "another user's application",
      (mine, theirs) => ({ applicationId: theirs, questions: SCORED }),
      404,
      'Application not found',
    ],
    [
      'a question without a score',
      (mine) => ({ applicationId: mine, questions: [{ ...SCORED[0], score: undefined }] }),
      400,
      expect.stringContaining('Path `score` is required'),
    ],
  ])('rejects %s', async (label, body, status, error) => {
    const agent = await loginAs(app, { userName: ME });
    const mine = await saveApplication(agent);
    const theirs = await saveApplication(await loginAs(app, { userName: OTHER }));

    const response = await agent
      .post('/interview/attempt')
      .send(body(mine._id, theirs._id))
      .expect(status);

    expect(response.body).toEqual({ error });
    expect(await InterviewAttempt.countDocuments()).toBe(0);
  });
});

describe('GET /interview/question/:applicationId/:questionId', () => {
  it('returns the saved question without a score after it was practised again', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await saveAttempt(agent, application._id);
    await saveAttempt(agent, application._id, [{ ...SCORED[2], score: 10 }]);

    const response = await agent.get(`/interview/question/${application._id}/3`).expect(200);

    expect(response.body).toEqual({
      questionId: 3,
      question: SCORED[2].question,
      type: 'System Design',
      difficulty: 'Hard',
    });
  });

  it('returns a question only for its own application', async () => {
    const agent = await loginAs(app, { userName: ME });
    const practised = await saveApplication(agent);
    const other = await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Data Intern' }),
    });
    await saveAttempt(agent, practised._id);

    const response = await agent.get(`/interview/question/${other._id}/1`).expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });

  it('answers 404 for a question id that is not a number', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await saveAttempt(agent, application._id);

    const response = await agent.get(`/interview/question/${application._id}/abc`).expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });

  it('answers 404 for a malformed application id', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await saveAttempt(agent, application._id);

    const response = await agent.get('/interview/question/nope/1').expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });

  it("hides another user's question", async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await saveAttempt(agent, application._id);
    const other = await loginAs(app, { userName: OTHER });

    const response = await other.get(`/interview/question/${application._id}/1`).expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });
});

describe('GET /interview/dashboard', () => {
  it('lists applied and interview-stage jobs once per title with their best scores', async () => {
    const agent = await loginAs(app, { userName: ME });
    const job = await saveApplication(agent, { status: 'applied' });
    await saveApplication(agent, {
      opportunity: manualOpportunity({
        type: 'internship',
        title: 'Data Intern',
        organisation: 'Grab',
      }),
      status: 'interview',
    });
    await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Backend Intern' }),
      status: 'saved',
    });
    await saveApplication(agent, {
      opportunity: manualOpportunity({ type: 'hackathon', title: 'Hack&Roll' }),
      status: 'submitted',
    });
    await saveApplication(agent, {
      opportunity: manualOpportunity({ organisation: 'Shopee' }),
      status: 'applied',
    });
    await saveAttempt(agent, job._id, [
      { ...SCORED[0], score: 6 },
      { ...SCORED[1], score: 9 },
    ]);
    const someoneElse = await loginAs(app, { userName: OTHER });
    const theirs = await saveApplication(someoneElse, {
      opportunity: manualOpportunity({ title: 'Platform Intern', organisation: 'Sea' }),
      status: 'applied',
    });
    await saveAttempt(someoneElse, theirs._id, [{ ...SCORED[2], score: 10 }]);

    const { body } = await agent.get('/interview/dashboard').expect(200);

    expect(body.applicationCards.map((card) => [card.title, card.company, card.status])).toEqual([
      ['Frontend Intern', 'Acme', 'applied'],
      ['Data Intern', 'Grab', 'interview'],
    ]);
    expect(body.titles).toEqual(['Frontend Intern', 'Data Intern']);
    expect(body.highestScore).toBe(9);
    expect(body.averageScore).toBe('7.5');
    expect(body.allQuestions).toEqual([
      {
        questionId: 1,
        question: SCORED[0].question,
        type: 'Behavioural',
        difficulty: 'Easy',
        applicationId: job._id,
        title: 'Frontend Intern',
        bestScore: 6,
      },
      {
        questionId: 2,
        question: SCORED[1].question,
        type: 'Technical',
        difficulty: 'Medium',
        applicationId: job._id,
        title: 'Frontend Intern',
        bestScore: 9,
      },
    ]);
  });

  it('lists questions in the order they were first practised', async () => {
    const agent = await loginAs(app, { userName: ME });
    const job = await saveApplication(agent, { status: 'applied' });
    const userId = await idOf(ME);
    await InterviewAttempt.create({
      userId,
      applicationId: job._id,
      completedAt: new Date('2026-11-03T09:00:00Z'),
      questions: [SCORED[1]],
    });
    await InterviewAttempt.create({
      userId,
      applicationId: job._id,
      completedAt: new Date('2026-11-02T09:00:00Z'),
      questions: [SCORED[0]],
    });

    const { body } = await agent.get('/interview/dashboard').expect(200);

    expect(body.allQuestions.map((question) => question.questionId)).toEqual([1, 2]);
  });

  it('lists a question once with its best score when it is practised again', async () => {
    const agent = await loginAs(app, { userName: ME });
    const job = await saveApplication(agent, { status: 'applied' });
    await saveAttempt(agent, job._id, [
      { ...SCORED[0], score: 6 },
      { ...SCORED[1], score: 9 },
    ]);
    await saveAttempt(agent, job._id, [
      { ...SCORED[0], score: 4 },
      { ...SCORED[1], score: 10 },
    ]);

    const { body } = await agent.get('/interview/dashboard').expect(200);

    expect(body.allQuestions.map((question) => [question.questionId, question.bestScore])).toEqual([
      [1, 6],
      [2, 10],
    ]);
    expect(body.highestScore).toBe(10);
    expect(body.averageScore).toBe('8.0');
  });

  it('is empty for a new user', async () => {
    const agent = await loginAs(app, { userName: ME });

    const { body } = await agent.get('/interview/dashboard').expect(200);

    expect(body).toEqual({
      applicationCards: [],
      titles: [],
      allQuestions: [],
      highestScore: 0,
      averageScore: 0,
      seniorTips: [],
    });
  });

  it('drops questions whose application left the applied or interview stage', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent, { status: 'applied' });
    await saveAttempt(agent, application._id);
    await agent.patch(`/application/${application._id}`).send({ status: 'rejected' }).expect(200);

    const { body } = await agent.get('/interview/dashboard').expect(200);

    expect(body.allQuestions).toEqual([]);
  });
});
