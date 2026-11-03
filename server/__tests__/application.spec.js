import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const ADZUNA_JOB = {
  source: 'adzuna',
  externalId: '5001',
  type: 'internship',
  title: 'Frontend Intern',
  organisation: 'Acme',
  location: 'Singapore',
  description: 'Build the dashboard in Vue.',
  url: 'https://www.adzuna.sg/details/5001',
  minSalary: 24000,
  maxSalary: 36000,
  salaryIsPredicted: false,
  contractTime: 'full_time',
  contractType: 'permanent',
  postedAt: '2026-10-30T00:00:00Z',
};

const ME = 'kellie.jubela@smu.edu.sg';
const OTHER = 'someone.else@smu.edu.sg';

async function idOf(userName) {
  return String((await User.findOne({ userName }))._id);
}

describe('POST /application', () => {
  it('creates the opportunity and the application in one call', async () => {
    const agent = await loginAs(app, { userName: ME });

    const response = await agent
      .post('/application')
      .send({ opportunity: ADZUNA_JOB, notes: 'Saved via techtrek.' })
      .expect(201);

    expect(response.body).toMatchObject({ status: 'saved', notes: 'Saved via techtrek.' });
    expect(response.body.userId).toBe(await idOf(ME));
    expect(await Opportunity.countDocuments()).toBe(1);
    expect(await Application.countDocuments()).toBe(1);
  });

  it('returns the opportunity populated so the client needs no second request', async () => {
    const agent = await loginAs(app, { userName: ME });

    const response = await agent.post('/application').send({ opportunity: ADZUNA_JOB }).expect(201);

    expect(response.body.opportunityId.title).toBe('Frontend Intern');
  });

  it('reuses the opportunity and refuses a second application for it', async () => {
    const me = await loginAs(app, { userName: ME });
    const other = await loginAs(app, { userName: OTHER });
    await me.post('/application').send({ opportunity: ADZUNA_JOB }).expect(201);

    const again = await me.post('/application').send({ opportunity: ADZUNA_JOB }).expect(409);
    await other.post('/application').send({ opportunity: ADZUNA_JOB }).expect(201);

    expect(again.body.error).toBe('Application already exists');
    expect(await Opportunity.countDocuments()).toBe(1);
    expect(await Application.countDocuments()).toBe(2);
  });

  it('rejects without an opportunity', async () => {
    const agent = await loginAs(app, { userName: ME });

    const response = await agent.post('/application').send({ status: 'saved' }).expect(400);

    expect(response.body.error).toBe('Opportunity is required');
  });

  it('rejects an unknown status and an invalid opportunity', async () => {
    const agent = await loginAs(app, { userName: ME });

    const unknownStatus = await agent
      .post('/application')
      .send({ opportunity: manualOpportunity(), status: 'maybe' })
      .expect(400);
    const invalid = await agent
      .post('/application')
      .send({ opportunity: { ...ADZUNA_JOB, source: 'devpost', type: 'job' } })
      .expect(400);

    expect(unknownStatus.body.error).toContain('status');
    expect(invalid.body.error).toContain("type 'job' is not allowed for source 'devpost'");
    expect(await Application.countDocuments()).toBe(0);
  });

  it('ignores a userId in the body', async () => {
    const me = await loginAs(app, { userName: ME });
    await loginAs(app, { userName: OTHER });

    await me
      .post('/application')
      .send({ opportunity: ADZUNA_JOB, userId: await idOf(OTHER) })
      .expect(201);

    const stored = await Application.findOne();
    expect(String(stored.userId)).toBe(await idOf(ME));
  });
});

describe('GET /application', () => {
  afterEach(() => vi.useRealTimers());

  it('lists only my applications, most recently updated first, with the opportunity populated', async () => {
    const me = await loginAs(app, { userName: ME });
    const other = await loginAs(app, { userName: OTHER });
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start + 1000);
    const first = await saveApplication(me, { opportunity: manualOpportunity({ title: 'First' }) });
    vi.setSystemTime(start + 2000);
    await saveApplication(me, { opportunity: manualOpportunity({ title: 'Second' }) });
    vi.setSystemTime(start + 3000);
    await saveApplication(me, { opportunity: manualOpportunity({ title: 'Third' }) });
    await saveApplication(other, { opportunity: manualOpportunity({ title: 'Theirs' }) });
    await saveApplication(other, { opportunity: manualOpportunity({ title: 'Also theirs' }) });

    vi.setSystemTime(start + 4000);
    await me.patch(`/application/${first._id}`).send({ status: 'applied' }).expect(200);
    const response = await me.get('/application').expect(200);

    expect(response.body.map((application) => application.opportunityId.title)).toEqual([
      'First',
      'Third',
      'Second',
    ]);
  });

  it('filters by status', async () => {
    const agent = await loginAs(app, { userName: ME });
    await saveApplication(agent, { opportunity: manualOpportunity({ title: 'Saved one' }) });
    await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Applied one' }),
      status: 'applied',
    });

    const response = await agent.get('/application?status=applied').expect(200);

    expect(response.body.map((application) => application.opportunityId.title)).toEqual([
      'Applied one',
    ]);
  });
});

describe('GET /application/:id', () => {
  it('returns my application with the opportunity populated', async () => {
    const agent = await loginAs(app, { userName: ME });
    await saveApplication(agent, { opportunity: manualOpportunity({ title: 'First' }) });
    const second = await saveApplication(agent, {
      opportunity: manualOpportunity({ title: 'Second' }),
    });

    const response = await agent.get(`/application/${second._id}`).expect(200);

    expect(response.body.opportunityId.title).toBe('Second');
  });

  it("hides another user's application", async () => {
    const me = await loginAs(app, { userName: ME });
    const other = await loginAs(app, { userName: OTHER });
    const theirs = await saveApplication(other);

    const response = await me.get(`/application/${theirs._id}`).expect(404);

    expect(response.body.error).toBe('Application not found');
  });

  it('answers 400 for a malformed id', async () => {
    const agent = await loginAs(app, { userName: ME });

    const response = await agent.get('/application/nope').expect(400);

    expect(response.body.error).toBe('Invalid ID');
  });
});

describe('PATCH /application/:id', () => {
  it('updates every editable field', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);
    const changes = {
      status: 'interview',
      notes: 'Bring the portfolio.',
      deadline: '2026-11-20T15:59:00.000Z',
      interviewAt: '2026-11-12T02:00:00.000Z',
      contactName: 'Ivy Tan',
      checklist: [{ label: 'CV', done: true }],
    };

    const response = await agent.patch(`/application/${application._id}`).send(changes).expect(200);

    expect(response.body).toMatchObject(changes);
    expect(response.body.opportunityId.title).toBe('Frontend Intern');
    const stored = await Application.findById(application._id).lean();
    expect(stored.checklist).toEqual([{ label: 'CV', done: true }]);
  });

  it.each([
    ['a checklist that is not a list', { checklist: 'x' }, 'checklist must be an array'],
    ['a checklist item without a label', { checklist: [{ done: true }] }, 'label'],
    ['an unknown status', { status: 'won' }, 'status'],
    ['a deadline that is not a date', { deadline: 'abc' }, 'deadline'],
  ])('rejects %s', async (label, changes, message) => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);

    const response = await agent.patch(`/application/${application._id}`).send(changes).expect(400);

    expect(response.body.error).toContain(message);
  });

  it("cannot touch another user's application", async () => {
    const me = await loginAs(app, { userName: ME });
    const other = await loginAs(app, { userName: OTHER });
    const mine = await saveApplication(me);
    const theirs = await saveApplication(other);

    await me.patch(`/application/${theirs._id}`).send({ status: 'rejected' }).expect(404);

    expect((await Application.findById(theirs._id)).status).toBe('saved');
    expect((await Application.findById(mine._id)).status).toBe('saved');
  });

  it('ignores userId and opportunityId in the body', async () => {
    const me = await loginAs(app, { userName: ME });
    await loginAs(app, { userName: OTHER });
    const application = await saveApplication(me);
    const elsewhere = await Opportunity.create(manualOpportunity({ title: 'Elsewhere' }));

    await me
      .patch(`/application/${application._id}`)
      .send({ notes: 'Moved', userId: await idOf(OTHER), opportunityId: String(elsewhere._id) })
      .expect(200);

    const stored = await Application.findById(application._id);
    expect(String(stored.userId)).toBe(await idOf(ME));
    expect(String(stored.opportunityId)).toBe(application.opportunityId._id);
    expect(stored.notes).toBe('Moved');
  });
});

describe('DELETE /application/:id', () => {
  it('deletes mine', async () => {
    const agent = await loginAs(app, { userName: ME });
    const application = await saveApplication(agent);

    await agent.delete(`/application/${application._id}`).expect(204);

    expect(await Application.countDocuments()).toBe(0);
  });

  it("leaves another user's", async () => {
    const me = await loginAs(app, { userName: ME });
    const other = await loginAs(app, { userName: OTHER });
    await saveApplication(me);
    const theirs = await saveApplication(other);

    await me.delete(`/application/${theirs._id}`).expect(404);

    expect(await Application.countDocuments()).toBe(2);
  });
});
