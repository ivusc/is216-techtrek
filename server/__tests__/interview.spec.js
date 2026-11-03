import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';
import { stubGemini } from './helpers/upstream.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const InterviewAttempt = require('../models/interviewAttempt');

const ME = 'kellie.jubela@smu.edu.sg';

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

describe('POST /interview/feedback', () => {
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
  it.each([
    [
      'a question without a score',
      (mine) => ({ applicationId: mine, questions: [{ ...SCORED[0], score: undefined }] }),
      400,
      'Path `score` is required',
    ],
  ])('rejects %s', async (label, body, status, message) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);

    const response = await agent
      .post('/interview/attempt')
      .send(body(application._id))
      .expect(status);

    expect(response.body.error).toContain(message);
    expect(await InterviewAttempt.countDocuments()).toBe(0);
  });
});

describe('GET /interview/question/:applicationId/:questionId', () => {
  it('returns a question only for its own application', async () => {
    const agent = await loginAs(app, { userName: ME });
    const practised = await saveApplication(agent);
    const other = await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Data Intern' }),
    });
    await agent
      .post('/interview/attempt')
      .send({ applicationId: practised._id, questions: SCORED })
      .expect(201);

    const response = await agent.get(`/interview/question/${other._id}/1`).expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });

  it('answers 404 for a question id that is not a number', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await agent
      .post('/interview/attempt')
      .send({ applicationId: application._id, questions: SCORED })
      .expect(201);

    const response = await agent.get(`/interview/question/${application._id}/abc`).expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });

  it('answers 404 for a malformed application id', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    await agent
      .post('/interview/attempt')
      .send({ applicationId: application._id, questions: SCORED })
      .expect(201);

    const response = await agent.get('/interview/question/nope/1').expect(404);

    expect(response.body).toEqual({ error: 'Question not found' });
  });
});
