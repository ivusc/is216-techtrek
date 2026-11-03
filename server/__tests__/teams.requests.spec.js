import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const app = require('../app');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const DAY = 24 * 60 * 60 * 1000;
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

async function post(agent, team) {
  return (await agent.post('/teams').send(team).expect(201)).body;
}

async function ask(agent, teamId, body = { role: 'Designer' }) {
  return (await agent.post(`/teams/${teamId}/requests`).send(body).expect(201)).body;
}

async function answer(leader, requestId, status) {
  await leader.patch(`/teams/requests/${requestId}`).send({ status }).expect(200);
}

async function pendingRequest(team = TEAM) {
  const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
  const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
  const created = await post(leader, team);
  const joinRequest = await ask(member, created._id);
  return { leader, member, teamId: created._id, requestId: joinRequest._id };
}

async function fill(leader, team) {
  const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
  await answer(leader, (await ask(member, team._id))._id, 'accepted');
}

describe('POST /teams/:id/requests', () => {
  it('creates a pending request that shares the profile by default', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const team = await post(leader, TEAM);

    const response = await member
      .post(`/teams/${team._id}/requests`)
      .send({ role: 'Designer', message: 'I design in Figma.' })
      .expect(201);

    expect(response.body).toEqual({ _id: expect.any(String), status: 'pending' });
    expect((await TeamRequest.findById(response.body._id)).toObject()).toMatchObject({
      role: 'Designer',
      message: 'I design in Figma.',
      shareProfile: true,
      status: 'pending',
    });
  });

  it('auto-accepts when a wanted skill matches, case-insensitively', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    await member
      .patch('/me')
      .send({ skills: ['vue.js'] })
      .expect(200);
    const team = await post(leader, {
      ...TEAM,
      teamSize: 2,
      openSlots: 1,
      autoAccept: true,
      skills: ['Vue.js'],
    });

    const joinRequest = await ask(member, team._id, { role: 'Developer' });

    expect(joinRequest.status).toBe('accepted');
    const stored = await Team.findById(team._id);
    expect(stored.members.map((teamMember) => teamMember.role)).toEqual(['Team lead', 'Developer']);
    expect(stored.status).toBe('closed');
  });

  it('leaves the request pending when no skill matches', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    await member
      .patch('/me')
      .send({ skills: ['Rust'] })
      .expect(200);
    const team = await post(leader, { ...TEAM, autoAccept: true, skills: ['Vue.js'] });

    const joinRequest = await ask(member, team._id);

    expect(joinRequest.status).toBe('pending');
    expect((await Team.findById(team._id)).members).toHaveLength(1);
  });

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
    await answer(leader, requestId, 'accepted');

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
    ['a draft', { status: 'draft' }, () => {}],
    ['closed', { teamSize: 2, openSlots: 1 }, fill],
    ['full', {}, (leader, team) => Team.updateOne({ _id: team._id }, { externalMembers: 3 })],
    ['past its close date', { closesAt: new Date(Date.now() - DAY) }, () => {}],
  ])('refuses a team that is %s', async (label, overrides, prepare) => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const requester = await loginAs(app, { userName: 'requester@smu.edu.sg' });
    const team = await post(leader, { ...TEAM, ...overrides });
    await prepare(leader, team);
    const requestsBefore = await TeamRequest.countDocuments();

    const response = await requester
      .post(`/teams/${team._id}/requests`)
      .send({ role: 'Designer' })
      .expect(409);

    expect(response.body.error).toBe('This team is not taking requests');
    expect(await TeamRequest.countDocuments()).toBe(requestsBefore);
  });

  it('answers 404 for an unknown team', async () => {
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });

    await member
      .post(`/teams/${new mongoose.Types.ObjectId()}/requests`)
      .send({ role: 'Designer' })
      .expect(404);

    expect(await TeamRequest.countDocuments()).toBe(0);
  });
});

describe('PATCH /teams/requests/:id', () => {
  it('declines without changing the team', async () => {
    const { leader, teamId, requestId } = await pendingRequest();

    const response = await leader
      .patch(`/teams/requests/${requestId}`)
      .send({ status: 'declined' })
      .expect(200);

    expect(response.body.status).toBe('declined');
    const team = await Team.findById(teamId);
    expect([team.members.length, team.status]).toEqual([1, 'open']);
  });

  it('accepts and closes the team when the last slot fills, then refuses more', async () => {
    const { leader, teamId, requestId } = await pendingRequest({
      ...TEAM,
      teamSize: 2,
      openSlots: 1,
    });
    const late = await ask(await loginAs(app, { userName: 'late@smu.edu.sg' }), teamId);

    await answer(leader, requestId, 'accepted');
    const refused = await leader
      .patch(`/teams/requests/${late._id}`)
      .send({ status: 'accepted' })
      .expect(409);

    expect(refused.body.error).toBe('This team is already full');
    const team = await Team.findById(teamId);
    expect([team.members.length, team.status]).toEqual([2, 'closed']);
    expect((await TeamRequest.findById(late._id)).status).toBe('pending');
  });

  it('is only for the leader', async () => {
    const { member, requestId } = await pendingRequest();

    const response = await member
      .patch(`/teams/requests/${requestId}`)
      .send({ status: 'accepted' })
      .expect(403);
    await member
      .patch(`/teams/requests/${new mongoose.Types.ObjectId()}`)
      .send({ status: 'accepted' })
      .expect(404);

    expect(response.body.error).toBe('Only leader can respond');
    expect((await TeamRequest.findById(requestId)).status).toBe('pending');
  });
});

describe('DELETE /teams/requests/:id', () => {
  it('withdraws my pending request', async () => {
    const { member, requestId } = await pendingRequest();

    await member.delete(`/teams/requests/${requestId}`).expect(204);

    expect(await TeamRequest.countDocuments()).toBe(0);
  });

  it('is only for the requester', async () => {
    const { leader, requestId } = await pendingRequest();

    const response = await leader.delete(`/teams/requests/${requestId}`).expect(403);

    expect(response.body.error).toBe('Forbidden');
    expect(await TeamRequest.countDocuments()).toBe(1);
  });

  it('cannot withdraw an answered request', async () => {
    const { leader, member, teamId, requestId } = await pendingRequest();
    await answer(leader, requestId, 'accepted');

    await member
      .delete(`/teams/requests/${requestId}`)
      .expect(409, { error: 'This request has already been answered' });

    expect(await TeamRequest.findById(requestId)).not.toBeNull();
    expect((await Team.findById(teamId)).members).toHaveLength(2);
  });
});

describe('GET /teams/requests/incoming', () => {
  it('hides the profile of someone who chose not to share it', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = await post(leader, TEAM);
    for (const [userName, shareProfile] of [
      ['hidden@smu.edu.sg', false],
      ['shared@smu.edu.sg', true],
    ]) {
      const requester = await loginAs(app, { userName });
      await requester
        .patch('/me')
        .send({ year: 2, skills: ['Figma'], githubUrl: 'https://github.com/someone' })
        .expect(200);
      await ask(requester, team._id, { role: 'Designer', shareProfile });
    }

    const incoming = (await leader.get('/teams/requests/incoming').expect(200)).body;

    const users = Object.fromEntries(
      incoming.map((request) => [request.user.displayName, request.user]),
    );
    expect(users.Hidden).toMatchObject({ year: 2, skills: [] });
    expect(users.Hidden).not.toHaveProperty('githubUrl');
    expect(users.Shared).toMatchObject({
      year: 2,
      skills: ['Figma'],
      githubUrl: 'https://github.com/someone',
    });
  });

  it('lists all statuses for the teams I lead', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const otherLeader = await loginAs(app, { userName: 'other.leader@smu.edu.sg' });
    const team = await post(leader, TEAM);
    const elsewhere = await post(otherLeader, { ...TEAM, name: 'Elsewhere' });
    const requests = [];
    for (const userName of ['ada@smu.edu.sg', 'bea@smu.edu.sg', 'cy@smu.edu.sg']) {
      const requester = await loginAs(app, { userName });
      requests.push(await ask(requester, team._id));
      await ask(requester, elsewhere._id);
    }
    await answer(leader, requests[0]._id, 'accepted');
    await answer(leader, requests[1]._id, 'declined');

    const incoming = (await leader.get('/teams/requests/incoming').expect(200)).body;

    expect(incoming.map((request) => request.status).sort()).toEqual([
      'accepted',
      'declined',
      'pending',
    ]);
    expect(incoming.map((request) => request.team.name)).toEqual(['Byte Me', 'Byte Me', 'Byte Me']);
  });
});
