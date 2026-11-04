import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const Notification = require('../models/Notification');

const DAY = 24 * 60 * 60 * 1000;
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 2, openSlots: 1, pitch: 'Build' };

async function setUp(team = TEAM) {
  const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
  const first = await loginAs(app, { userName: 'first@smu.edu.sg' });
  const second = await loginAs(app, { userName: 'second@smu.edu.sg' });
  const created = (await leader.post('/teams').send(team).expect(201)).body;
  return { leader, first, second, team: created };
}

async function ask(agent, teamId) {
  return (await agent.post(`/teams/${teamId}/requests`).send({ role: 'Designer' }).expect(201)).body;
}

describe('closing requests that can no longer be answered', () => {
  it('closes the other waiting requests once the last spot is filled, and tells them why', async () => {
    const { leader, first, second, team } = await setUp();
    const firstRequest = await ask(first, team._id);
    const secondRequest = await ask(second, team._id);

    await leader.patch(`/teams/requests/${firstRequest._id}`).send({ status: 'accepted' }).expect(200);

    const closed = await TeamRequest.findById(secondRequest._id);
    expect(closed.status).toBe('declined');
    expect(closed.closedReason).toBe('full');
    const { body } = await second.get('/notifications').expect(200);
    expect(body.notifications[0]).toMatchObject({ type: 'team-full', teamName: 'Byte Me', about: 'request' });
    const { body: sent } = await second.get('/teams/requests/sent').expect(200);
    expect(sent[0]).toMatchObject({ status: 'declined', closedReason: 'full' });
  });

  it('closes pending invites too when the team fills up', async () => {
    const { leader, first, second, team } = await setUp({ ...TEAM, teamSize: 2 });
    await leader.post(`/teams/${team._id}/invites`).send({ userName: 'second@smu.edu.sg' }).expect(201);
    const request = await ask(first, team._id);

    await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted' }).expect(200);

    const { body: invites } = await second.get('/teams/invites').expect(200);
    expect(invites).toEqual([]);
    const notification = await Notification.findOne({ type: 'team-full', about: 'invite' });
    expect(notification).not.toBeNull();
  });

  it('closes waiting requests when the lead shrinks the team to full', async () => {
    const { leader, first, team } = await setUp({ ...TEAM, teamSize: 3, openSlots: 2 });
    const request = await ask(first, team._id);

    await leader.patch(`/teams/${team._id}`).send({ teamSize: 3, openSlots: 0 }).expect(200);

    expect((await TeamRequest.findById(request._id)).closedReason).toBe('full');
  });

  it("closes waiting requests once the team's closing date has passed", async () => {
    const { leader, first, team } = await setUp({ ...TEAM, teamSize: 3, openSlots: 2 });
    const request = await ask(first, team._id);
    await Team.updateOne({ _id: team._id }, { closesAt: new Date(Date.now() - DAY) });

    // checked when people look at their requests or notifications
    await leader.get('/teams/requests/incoming').expect(200);

    expect((await TeamRequest.findById(request._id)).closedReason).toBe('closed');
    const { body } = await first.get('/notifications').expect(200);
    expect(body.notifications[0]).toMatchObject({ type: 'team-closed', about: 'request' });
  });

  it('lets someone ask again after their request was closed because the team was full', async () => {
    const { leader, first, second, team } = await setUp();
    const firstRequest = await ask(first, team._id);
    await ask(second, team._id);
    await leader.patch(`/teams/requests/${firstRequest._id}`).send({ status: 'accepted' }).expect(200);

    // a spot opens up again
    await first.post(`/teams/${team._id}/leave`).expect(204);
    const { body: teams } = await second.get('/teams').expect(200);
    expect(teams.find((t) => t._id === team._id)).toMatchObject({ requestStatus: null, requestId: null });

    await ask(second, team._id);
  });

  it('leaves requests alone while the team still has room', async () => {
    const { leader, first, second, team } = await setUp({ ...TEAM, teamSize: 3, openSlots: 2 });
    const firstRequest = await ask(first, team._id);
    const secondRequest = await ask(second, team._id);

    await leader.patch(`/teams/requests/${firstRequest._id}`).send({ status: 'accepted' }).expect(200);

    expect((await TeamRequest.findById(secondRequest._id)).status).toBe('pending');
  });
});
