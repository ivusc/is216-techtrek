import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const DAY = 24 * 60 * 60 * 1000;
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

async function pendingRequest(team = TEAM) {
  const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
  const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
  const created = await leader.post('/teams').send(team).expect(201);
  await member.post(`/teams/${created.body._id}/requests`).send({ role: 'Designer' }).expect(201);
  const joinRequest = await TeamRequest.findOne();
  return { leader, member, teamId: created.body._id, requestId: String(joinRequest._id) };
}

async function accept(leader, requestId) {
  await leader.patch(`/teams/requests/${requestId}`).send({ status: 'accepted' }).expect(200);
}

describe('POST /teams/:id/requests', () => {
  it('refuses a second request to the same team', async () => {
    const { member, teamId } = await pendingRequest();

    await member
      .post(`/teams/${teamId}/requests`)
      .send({ role: 'Developer' })
      .expect(409, { error: 'You have already asked to join this team' });

    expect(await TeamRequest.countDocuments()).toBe(1);
  });

  it('refuses the leader and current members', async () => {
    const { leader, member, teamId, requestId } = await pendingRequest();
    await accept(leader, requestId);

    for (const agent of [leader, member]) {
      const response = await agent
        .post(`/teams/${teamId}/requests`)
        .send({ role: 'Developer' })
        .expect(409);
      expect(response.body.error).toBe('You are already in this team');
    }
    expect(await TeamRequest.countDocuments()).toBe(1);
  });

  it.each([
    ['a draft', { ...TEAM, status: 'draft' }, null],
    ['closed', { ...TEAM, teamSize: 2, openSlots: 1 }, 'fill'],
    ['full', TEAM, { externalMembers: 3 }],
    ['past its close date', { ...TEAM, closesAt: new Date(Date.now() - DAY) }, null],
  ])('refuses a team that is %s', async (label, team, change) => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const requester = await loginAs(app, { userName: 'requester@smu.edu.sg' });
    const created = (await leader.post('/teams').send(team).expect(201)).body;
    if (change === 'fill') {
      const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
      await member.post(`/teams/${created._id}/requests`).send({}).expect(201);
      await accept(leader, String((await TeamRequest.findOne())._id));
    } else if (change) {
      await Team.updateOne({ _id: created._id }, change);
    }

    const response = await requester
      .post(`/teams/${created._id}/requests`)
      .send({ role: 'Designer' })
      .expect(409);

    expect(response.body.error).toBe('This team is not taking requests');
    expect(await TeamRequest.countDocuments()).toBe(change === 'fill' ? 1 : 0);
  });
});

describe('DELETE /teams/requests/:id', () => {
  it('cannot withdraw an answered request', async () => {
    const { leader, member, teamId, requestId } = await pendingRequest();
    await accept(leader, requestId);

    await member
      .delete(`/teams/requests/${requestId}`)
      .expect(409, { error: 'This request has already been answered' });

    expect(await TeamRequest.findById(requestId)).not.toBeNull();
    expect((await Team.findById(teamId)).members).toHaveLength(2);
  });
});
