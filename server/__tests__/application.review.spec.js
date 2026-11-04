import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Application = require('../models/Application');

const ME = 'kellie.jubela@smu.edu.sg';
const OTHER = 'someone.else@smu.edu.sg';

const REVIEW = {
  difficulty: 4,
  rounds: 'Online assessment, technical interview, hiring manager chat',
  tips: 'Revise graphs and talk through your thinking out loud.',
};

function trackGrab(agent, status = 'offer') {
  return saveApplication(agent, {
    opportunity: manualOpportunity({
      type: 'internship',
      organisation: 'Grab',
      title: 'Software Engineer Intern',
    }),
    status,
  });
}

describe('POST /application/:id/review', () => {
  it('stores the tips on an offer and keeps them from anyone else', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);

    const response = await agent
      .post(`/application/${application._id}/review`)
      .send(REVIEW)
      .expect(201);

    expect(response.body.review).toEqual({ ...REVIEW, createdAt: expect.any(String) });
    expect(response.body.opportunityId.organisation).toBe('Grab');
    const { body } = await agent.get(`/application/${application._id}`).expect(200);
    expect(body.review).toEqual(response.body.review);

    const other = await loginAs(app, { userName: OTHER });
    await other
      .post(`/application/${application._id}/review`)
      .send({ ...REVIEW, tips: 'Not mine to share.' })
      .expect(404);
    expect((await Application.findById(application._id)).review.tips).toBe(REVIEW.tips);
  });

  it('refuses a second set of tips for the same application', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);
    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);

    const response = await agent
      .post(`/application/${application._id}/review`)
      .send({ ...REVIEW, tips: 'Second thoughts.' })
      .expect(409);

    expect(response.body).toEqual({ error: 'You already shared tips for this application.' });
  });

  it('refuses tips for an application that has not reached Offer', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent, 'applied');

    const response = await agent
      .post(`/application/${application._id}/review`)
      .send(REVIEW)
      .expect(409);

    expect(response.body).toEqual({ error: 'Move the application to Offer first.' });
    expect((await Application.findById(application._id)).review).toBeUndefined();
  });

  it.each([
    ['tips are missing', { difficulty: 3 }],
    ['tips are blank', { difficulty: 3, tips: '   ' }],
    ['difficulty is above 5', { ...REVIEW, difficulty: 6 }],
    ['difficulty is not a whole number', { ...REVIEW, difficulty: 2.5 }],
  ])('answers 400 when %s', async (label, review) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);

    await agent.post(`/application/${application._id}/review`).send(review).expect(400);

    expect((await Application.findById(application._id)).review).toBeUndefined();
  });

  it('keeps the tips when the application is edited with a review field', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);
    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);

    const { body } = await agent
      .patch(`/application/${application._id}`)
      .send({ notes: 'Signed.', review: { difficulty: 1, tips: 'Overwritten.' } })
      .expect(200);

    expect(body.notes).toBe('Signed.');
    expect(body.review).toMatchObject(REVIEW);
  });
});

describe('PUT /application/:id/review', () => {
  it('lets me change my tips, keeping when they were first shared', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);
    const created = await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);

    const changed = { difficulty: 2, rounds: 'Just one interview', tips: 'Be yourself and ask questions.' };
    const { body } = await agent.put(`/application/${application._id}/review`).send(changed).expect(200);

    expect(body.review).toEqual({
      ...changed,
      createdAt: created.body.review.createdAt,
      updatedAt: expect.any(String),
    });
    expect((await Application.findById(application._id)).review.tips).toBe(changed.tips);
  });

  it('checks the new tips like new ones and keeps the old ones on a bad edit', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);
    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);

    await agent.put(`/application/${application._id}/review`).send({ difficulty: 3, tips: '  ' }).expect(400);

    expect((await Application.findById(application._id)).review.tips).toBe(REVIEW.tips);
  });

  it('answers 404 when there are no tips yet, or the application is someone else\'s', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);

    const none = await agent.put(`/application/${application._id}/review`).send(REVIEW).expect(404);
    expect(none.body).toEqual({ error: 'You have not shared tips for this application yet.' });

    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);
    const other = await loginAs(app, { userName: OTHER });
    await other.put(`/application/${application._id}/review`).send({ ...REVIEW, tips: 'Not mine.' }).expect(404);
    expect((await Application.findById(application._id)).review.tips).toBe(REVIEW.tips);
  });
});

describe('DELETE /application/:id/review', () => {
  it('takes my tips down so they can be shared again', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await trackGrab(agent);
    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);

    const other = await loginAs(app, { userName: OTHER });
    await other.delete(`/application/${application._id}/review`).expect(404);

    const { body } = await agent.delete(`/application/${application._id}/review`).expect(200);
    expect(body.review).toBeUndefined();
    expect((await Application.findById(application._id)).review).toBeUndefined();

    await agent.post(`/application/${application._id}/review`).send(REVIEW).expect(201);
  });
});
