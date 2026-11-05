import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');

const JOB = {
  source: 'adzuna',
  externalId: '5950707334',
  type: 'internship',
  title: 'Frontend Intern',
  organisation: 'Acme',
  location: 'Singapore',
  description: 'Build things in Vue.',
  url: 'https://adzuna.test/jobs/5950707334',
};

const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

describe('shared opportunity links', () => {
  it('saves the listing once and reads it back by id', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });

    const first = (await agent.post('/opportunity/share').send({ opportunity: JOB }).expect(201))
      .body;
    const again = (await agent.post('/opportunity/share').send({ opportunity: JOB }).expect(201))
      .body;
    expect(again._id).toBe(first._id);

    const { body } = await request(app).get(`/opportunity/item/${first._id}`).expect(200);
    expect(body).toMatchObject({ title: 'Frontend Intern', organisation: 'Acme', url: JOB.url });
  });

  it('needs a login and a valid listing to share', async () => {
    await request(app).post('/opportunity/share').send({ opportunity: JOB }).expect(401);
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await agent.post('/opportunity/share').send({}).expect(400);
    await agent
      .post('/opportunity/share')
      .send({ opportunity: { source: 'adzuna', title: 'No org' } })
      .expect(400);
  });

  it('answers 404 for an unknown or malformed id', async () => {
    await request(app).get('/opportunity/item/64b000000000000000000000').expect(404);
    await request(app).get('/opportunity/item/not-an-id').expect(404);
  });
});

describe('GET /teams/:id', () => {
  it('shows a published team to anyone logged in, with my request status', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
    const friend = await loginAs(app, { userName: 'friend@smu.edu.sg' });

    const before = (await friend.get(`/teams/${team._id}`).expect(200)).body;
    expect(before).toMatchObject({ name: 'Byte Me', requestStatus: null, canContact: false });
    expect(before.leader.userName).toBeUndefined();

    await friend.post(`/teams/${team._id}/requests`).send({ role: 'Designer' }).expect(201);
    expect((await friend.get(`/teams/${team._id}`).expect(200)).body.requestStatus).toBe('pending');
  });

  it('keeps drafts to the team, and 404s unknown ids', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const draft = (
      await leader
        .post('/teams')
        .send({ ...TEAM, status: 'draft' })
        .expect(201)
    ).body;
    const friend = await loginAs(app, { userName: 'friend@smu.edu.sg' });

    await leader.get(`/teams/${draft._id}`).expect(200);
    await friend.get(`/teams/${draft._id}`).expect(404);
    await friend.get('/teams/64b000000000000000000000').expect(404);
    await friend.get('/teams/not-an-id').expect(404);
  });

  it('still serves /teams/mine and /teams/invites', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await agent.get('/teams/mine').expect(200);
    await agent.get('/teams/invites').expect(200);
  });
});
