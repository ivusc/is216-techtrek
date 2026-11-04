import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Team = require('../models/Team');
const Notification = require('../models/Notification');

const TEAM = {
  name: 'Byte Me',
  eventName: 'Hack&Roll',
  teamSize: 4,
  openSlots: 2,
  pitch: 'Build',
  openRoles: ['Frontend developer', '  Designer  ', ''],
};

async function setUp(team = TEAM) {
  const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
  const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
  const created = (await leader.post('/teams').send(team).expect(201)).body;
  return { leader, member, team: created };
}

async function join(leader, member, teamId, role) {
  const request = (await member.post(`/teams/${teamId}/requests`).send({ role }).expect(201)).body;
  await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted' }).expect(200);
}

describe('open roles on a team post', () => {
  it('saves the roles for the open spots, trimmed and without blanks', async () => {
    const { team } = await setUp();

    expect(team.openRoles).toEqual(['Frontend developer', 'Designer']);
  });

  it('refuses more roles than open spots, on create and on edit', async () => {
    const { leader, team } = await setUp();
    const tooMany = await leader
      .post('/teams')
      .send({ ...TEAM, openRoles: ['A', 'B', 'C'] })
      .expect(400);
    expect(tooMany.body).toEqual({ error: 'You have 2 open spots, so list at most 2 roles.' });

    await leader.patch(`/teams/${team._id}`).send({ openRoles: ['A', 'B', 'C'] }).expect(400);
    const edited = await leader.patch(`/teams/${team._id}`).send({ openRoles: ['Backend developer'] }).expect(200);
    expect(edited.body.openRoles).toEqual(['Backend developer']);
  });
});

describe('requests for an open role', () => {
  it('only takes requests for one of the open roles', async () => {
    const { member, team } = await setUp();

    const wrong = await member.post(`/teams/${team._id}/requests`).send({ role: 'Mascot' }).expect(400);
    expect(wrong.body).toEqual({ error: 'Pick one of the open roles: Frontend developer, Designer' });
    await member.post(`/teams/${team._id}/requests`).send({ role: 'designer' }).expect(201);
  });

  it('gives the person the role they asked for and takes it off the open list', async () => {
    const { leader, member, team } = await setUp();

    await join(leader, member, team._id, 'designer');

    const saved = await Team.findById(team._id);
    expect(saved.openRoles).toEqual(['Frontend developer']);
    expect(saved.members.map((m) => m.role)).toEqual(['Team lead', 'Designer']);
  });

  it('opens the role again when that person leaves', async () => {
    const { leader, member, team } = await setUp();
    await join(leader, member, team._id, 'Designer');

    await member.post(`/teams/${team._id}/leave`).expect(204);

    expect((await Team.findById(team._id)).openRoles).toEqual(['Frontend developer', 'Designer']);
  });

  it('still takes any role when the team lists none', async () => {
    const { member, team } = await setUp({ ...TEAM, openRoles: [] });

    await member.post(`/teams/${team._id}/requests`).send({ role: 'Anything' }).expect(201);
  });
});

describe('PATCH /teams/:id/members/:userId', () => {
  it('lets the lead give a member a role, fills a matching open role and tells them', async () => {
    const { leader, member, team } = await setUp();
    await join(leader, member, team._id, 'Designer');
    const memberId = (await Team.findById(team._id)).members[1].userId;

    const { body } = await leader
      .patch(`/teams/${team._id}/members/${memberId}`)
      .send({ role: 'Frontend developer' })
      .expect(200);

    expect(body.members.map((m) => m.role)).toEqual(['Team lead', 'Frontend developer']);
    // they swapped: Frontend is filled, and Designer (their old role) is open again
    expect(body.openRoles).toEqual(['Designer']);
    const notification = await Notification.findOne({ userId: memberId, type: 'role-assigned' });
    expect(notification.role).toBe('Frontend developer');
    expect(notification.teamName).toBe('Byte Me');
    const { body: inbox } = await member.get('/notifications').expect(200);
    expect(inbox.notifications[0]).toMatchObject({ type: 'role-assigned', role: 'Frontend developer' });
  });

  it('keeps the open roles as they are when a member gets a role that was not open', async () => {
    const { leader, member, team } = await setUp();
    await join(leader, member, team._id, 'Designer');
    const memberId = (await Team.findById(team._id)).members[1].userId;

    const { body } = await leader.patch(`/teams/${team._id}/members/${memberId}`).send({ role: 'Designer + pitch' }).expect(200);

    expect(body.members[1].role).toBe('Designer + pitch');
    expect(body.openRoles).toEqual(['Frontend developer']);
  });

  it('lets the lead rename their own role, and clearing it goes back to Team lead', async () => {
    const { leader, team } = await setUp();
    const leaderId = team.leader._id;

    const renamed = await leader.patch(`/teams/${team._id}/members/${leaderId}`).send({ role: 'Lead · Backend' }).expect(200);
    expect(renamed.body.members[0].role).toBe('Lead · Backend');
    const cleared = await leader.patch(`/teams/${team._id}/members/${leaderId}`).send({ role: '' }).expect(200);
    expect(cleared.body.members[0].role).toBe('Team lead');
  });

  it('only the lead can give out roles, and only to people in the team', async () => {
    const { leader, member, team } = await setUp();
    await join(leader, member, team._id, 'Designer');
    const memberId = (await Team.findById(team._id)).members[1].userId;

    const notLead = await member.patch(`/teams/${team._id}/members/${memberId}`).send({ role: 'Boss' }).expect(403);
    expect(notLead.body).toEqual({ error: 'Only the team lead can give out roles' });
    const stranger = await loginAs(app, { userName: 'stranger@smu.edu.sg' });
    const strangerId = (await stranger.get('/me').expect(200)).body.user._id;
    await leader.patch(`/teams/${team._id}/members/${strangerId}`).send({ role: 'X' }).expect(404);
    await leader.patch(`/teams/${team._id}/members/${memberId}`).send({ role: 'x'.repeat(61) }).expect(400);
  });
});
