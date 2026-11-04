import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

async function post(agent, team = TEAM) {
  return (await agent.post('/teams').send(team).expect(201)).body;
}

async function ask(agent, teamId) {
  return (await agent.post(`/teams/${teamId}/requests`).send({ role: 'Designer' }).expect(201)).body;
}

async function notificationsOf(agent) {
  return (await agent.get('/notifications').expect(200)).body;
}

async function setUp() {
  const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
  const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
  const team = await post(leader);
  return { leader, member, team };
}

async function joined() {
  const { leader, member, team } = await setUp();
  const joinRequest = await ask(member, team._id);
  await leader.patch(`/teams/requests/${joinRequest._id}`).send({ status: 'accepted' }).expect(200);
  return { leader, member, team };
}

describe('POST /teams/:id/leave', () => {
  it('removes the member and opens their slot again', async () => {
    const { member, team } = await joined();

    await member.post(`/teams/${team._id}/leave`).expect(204);

    const stored = await Team.findById(team._id);
    expect(stored.members).toHaveLength(1);
    expect(stored.slotsOpen).toBe(2);
    expect(await TeamRequest.countDocuments({ teamId: team._id })).toBe(0);
  });

  it('lets someone who left ask to join again', async () => {
    const { member, team } = await joined();
    await member.post(`/teams/${team._id}/leave`).expect(204);

    await member.post(`/teams/${team._id}/requests`).send({ role: 'Designer' }).expect(201);
  });

  it('does not let the leader leave their own team', async () => {
    const { leader, team } = await setUp();

    const response = await leader.post(`/teams/${team._id}/leave`).expect(409);
    expect(response.body.error).toMatch(/cannot leave/);
  });

  it('refuses someone who is not in the team', async () => {
    const { member, team } = await setUp();
    await member.post(`/teams/${team._id}/leave`).expect(409);
  });

  it('needs a login', async () => {
    const { team } = await setUp();
    await request(app).post(`/teams/${team._id}/leave`).expect(401);
  });
});

describe('team notifications', () => {
  it('tells the leader about a new request, and the member when it is accepted', async () => {
    const { leader, member, team } = await setUp();
    const joinRequest = await ask(member, team._id);

    const leaderInbox = await notificationsOf(leader);
    expect(leaderInbox.unreadCount).toBe(1);
    expect(leaderInbox.notifications[0]).toMatchObject({ type: 'request-received', teamName: 'Byte Me', read: false });

    await leader.patch(`/teams/requests/${joinRequest._id}`).send({ status: 'accepted' }).expect(200);

    const memberInbox = await notificationsOf(member);
    expect(memberInbox.notifications.map((item) => item.type)).toEqual(['request-accepted']);
  });

  it('tells the member when a request is declined', async () => {
    const { leader, member, team } = await setUp();
    const joinRequest = await ask(member, team._id);
    await leader.patch(`/teams/requests/${joinRequest._id}`).send({ status: 'declined' }).expect(200);

    expect((await notificationsOf(member)).notifications[0].type).toBe('request-declined');
  });

  it('takes the notification back when a request is withdrawn', async () => {
    const { leader, member, team } = await setUp();
    const joinRequest = await ask(member, team._id);
    await member.delete(`/teams/requests/${joinRequest._id}`).expect(204);

    expect((await notificationsOf(leader)).notifications).toEqual([]);
  });

  it('tells people about invites and the leader about the answer', async () => {
    const { leader, member, team } = await setUp();
    const invite = (await leader.post(`/teams/${team._id}/invites`).send({ userName: 'member@smu.edu.sg' }).expect(201)).body;

    expect((await notificationsOf(member)).notifications[0].type).toBe('invite-received');

    await member.patch(`/teams/invites/${invite._id}`).send({ status: 'accepted' }).expect(200);
    expect((await notificationsOf(leader)).notifications[0].type).toBe('invite-accepted');
  });

  it('tells the leader when a member leaves, and members when a team is deleted', async () => {
    const { leader, member, team } = await joined();
    await member.post(`/teams/${team._id}/leave`).expect(204);
    expect((await notificationsOf(leader)).notifications[0]).toMatchObject({ type: 'member-left', teamName: 'Byte Me' });

    const second = await post(leader, { ...TEAM, name: 'Second' });
    const joinRequest = await ask(member, second._id);
    await leader.patch(`/teams/requests/${joinRequest._id}`).send({ status: 'accepted' }).expect(200);
    await leader.delete(`/teams/${second._id}`).expect(204);
    expect((await notificationsOf(member)).notifications[0]).toMatchObject({ type: 'team-deleted', teamName: 'Second' });
  });

  it('marks one or all notifications as read, and only your own', async () => {
    const { leader, member, team } = await setUp();
    await ask(member, team._id);
    const [first] = (await notificationsOf(leader)).notifications;

    await member.patch(`/notifications/${first._id}/read`).expect(404);
    await leader.patch(`/notifications/${first._id}/read`).expect(200);
    expect((await notificationsOf(leader)).unreadCount).toBe(0);

    await leader.post('/teams').send({ ...TEAM, name: 'Other' }).expect(201);
    await leader.patch('/notifications/read').expect(204);
    expect((await notificationsOf(leader)).unreadCount).toBe(0);
  });

  it('needs a login', async () => {
    await request(app).get('/notifications').expect(401);
  });
});

describe('DELETE /teams/invites/:id', () => {
  async function invited() {
    const { leader, member, team } = await setUp();
    const invite = (await leader.post(`/teams/${team._id}/invites`).send({ userName: 'member@smu.edu.sg' }).expect(201)).body;
    return { leader, member, team, invite };
  }

  it('lets the team lead cancel an invite and removes the invite notification', async () => {
    const { leader, member, invite } = await invited();

    await leader.delete(`/teams/invites/${invite._id}`).expect(204);

    expect(await TeamRequest.findById(invite._id)).toBeNull();
    expect((await member.get('/teams/invites').expect(200)).body).toEqual([]);
    expect((await notificationsOf(member)).notifications).toEqual([]);
  });

  it('only lets the team lead cancel', async () => {
    const { member, invite } = await invited();

    const response = await member.delete(`/teams/invites/${invite._id}`).expect(403);

    expect(response.body.error).toBe('Only the team lead can cancel invites');
    expect(await TeamRequest.findById(invite._id)).not.toBeNull();
  });

  it('404s for an unknown invite or a join request id', async () => {
    const { leader, member, team } = await setUp();
    const joinRequest = await ask(member, team._id);

    await leader.delete('/teams/invites/000000000000000000000000').expect(404);
    await leader.delete(`/teams/invites/${joinRequest._id}`).expect(404);
  });

  it('needs a login', async () => {
    await request(app).delete('/teams/invites/000000000000000000000000').expect(401);
  });
});
