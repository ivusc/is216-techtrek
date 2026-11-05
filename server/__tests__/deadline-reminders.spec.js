import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Notification = require('../models/Notification');
const { reminderFor } = require('../service/deadline-reminders');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// a deadline this far from now, as an ISO string
const inFuture = (ms) => new Date(Date.now() + ms).toISOString();

async function track(agent, { deadline, status, opportunity = manualOpportunity() } = {}) {
  return (await agent.post('/application').send({ opportunity, status, deadline }).expect(201))
    .body;
}

async function reminders(agent) {
  const { body } = await agent.get('/notifications').expect(200);
  return body.notifications.filter((notification) => notification.type === 'deadline-reminder');
}

describe('reminderFor', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  const at = (ms) => new Date(now.getTime() + ms);

  it('gives a 3-day reminder with 2 or 3 days left, and a 1-day reminder from 1 day left until the deadline', () => {
    expect(reminderFor(at(3 * DAY), now)).toBe('3-day');
    expect(reminderFor(at(2 * DAY - HOUR), now)).toBe('3-day');
    expect(reminderFor(at(DAY), now)).toBe('1-day');
    expect(reminderFor(at(HOUR), now)).toBe('1-day');
  });

  it('gives nothing when the deadline is further away, already past, or missing', () => {
    expect(reminderFor(at(3 * DAY + HOUR), now)).toBeNull();
    expect(reminderFor(at(-HOUR), now)).toBeNull();
    expect(reminderFor(null, now)).toBeNull();
  });
});

describe('deadline reminders in GET /notifications', () => {
  it('reminds me 3 days before a tracked deadline, once', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const application = await track(agent, { deadline: inFuture(3 * DAY - HOUR) });

    const first = await reminders(agent);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      applicationId: application._id,
      title: 'Frontend Intern',
      organisation: 'Acme',
      daysLeft: 3,
      read: false,
    });

    // loading the bell again doesn't add a second copy
    expect(await reminders(agent)).toHaveLength(1);
  });

  it('reminds me again 1 day before', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const application = await track(agent, { deadline: inFuture(3 * DAY - HOUR) });
    await reminders(agent);

    // the deadline is now tomorrow
    await agent
      .patch(`/application/${application._id}`)
      .send({ deadline: inFuture(DAY - HOUR) })
      .expect(200);

    const list = await reminders(agent);
    expect(list.map((notification) => notification.daysLeft)).toEqual([1, 3]);
  });

  it("uses the listing's own deadline when the application has none", async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await track(agent, { opportunity: manualOpportunity({ deadline: inFuture(DAY - HOUR) }) });

    expect((await reminders(agent)).map((notification) => notification.daysLeft)).toEqual([1]);
  });

  it('stays quiet for far-off, past and finished deadlines', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await track(agent, {
      deadline: inFuture(10 * DAY),
      opportunity: manualOpportunity({ title: 'Far' }),
    });
    await track(agent, {
      deadline: inFuture(-DAY),
      opportunity: manualOpportunity({ title: 'Past' }),
    });
    await track(agent, {
      deadline: inFuture(DAY - HOUR),
      status: 'rejected',
      opportunity: manualOpportunity({ title: 'Rejected' }),
    });

    expect(await reminders(agent)).toHaveLength(0);
  });

  it('only reminds the person who tracked it', async () => {
    const owner = await loginAs(app, { userName: 'owner@smu.edu.sg' });
    const someoneElse = await loginAs(app, { userName: 'other@smu.edu.sg' });
    await track(owner, { deadline: inFuture(DAY - HOUR) });

    expect(await reminders(someoneElse)).toHaveLength(0);
    expect(await reminders(owner)).toHaveLength(1);
  });

  it('removes the reminders when the application is deleted', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const application = await track(agent, { deadline: inFuture(DAY - HOUR) });
    await reminders(agent);

    await agent.delete(`/application/${application._id}`).expect(204);

    expect(await Notification.countDocuments({ applicationId: application._id })).toBe(0);
  });

  it('needs a login', async () => {
    await request(app).get('/notifications').expect(401);
  });
});
