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

describe('the lead answering a request for a role', () => {
  async function ask(member, teamId, role) {
    return (await member.post(`/teams/${teamId}/requests`).send({ role }).expect(201)).body;
  }

  it('tells the lead which role was asked for, and the new member which role they got', async () => {
    const { leader, member, team } = await setUp();
    const request = await ask(member, team._id, 'Designer');

    const { body: leadInbox } = await leader.get('/notifications').expect(200);
    expect(leadInbox.notifications[0]).toMatchObject({ type: 'request-received', role: 'Designer' });
    const { body: incoming } = await leader.get('/teams/requests/incoming').expect(200);
    expect(incoming[0].team.openRoles).toEqual(['Frontend developer', 'Designer']);

    const answered = await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted' }).expect(200);
    expect(answered.body).toEqual({ _id: request._id, status: 'accepted', role: 'Designer' });
    const { body: memberInbox } = await member.get('/notifications').expect(200);
    expect(memberInbox.notifications[0]).toMatchObject({ type: 'request-accepted', role: 'Designer' });
  });

  it('a different role needs their OK: the request becomes an offer they accept on their side', async () => {
    const { leader, member, team } = await setUp();
    const request = await ask(member, team._id, 'Designer');

    const { body } = await leader
      .patch(`/teams/requests/${request._id}`)
      .send({ status: 'accepted', role: 'frontend developer' })
      .expect(200);

    // nobody joins yet
    expect(body).toMatchObject({ status: 'pending', kind: 'invite', role: 'Frontend developer', askedRole: 'Designer' });
    let saved = await Team.findById(team._id);
    expect(saved.members).toHaveLength(1);
    expect(saved.openRoles).toEqual(['Frontend developer', 'Designer']);

    // the lead sees it waiting, and can't answer it again
    const { body: incoming } = await leader.get('/teams/requests/incoming').expect(200);
    expect(incoming[0]).toMatchObject({ status: 'pending', kind: 'invite', role: 'Frontend developer', askedRole: 'Designer' });
    await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted' }).expect(409);

    // they're told, and see it with their invites
    const { body: inbox } = await member.get('/notifications').expect(200);
    expect(inbox.notifications[0]).toMatchObject({ type: 'role-offered', role: 'Frontend developer' });
    const { body: invites } = await member.get('/teams/invites').expect(200);
    expect(invites[0]).toMatchObject({ _id: request._id, role: 'Frontend developer', askedRole: 'Designer' });

    // saying yes puts them in the team in the new role
    await member.patch(`/teams/invites/${request._id}`).send({ status: 'accepted' }).expect(200);
    saved = await Team.findById(team._id);
    expect(saved.members[1].role).toBe('Frontend developer');
    expect(saved.openRoles).toEqual(['Designer']);
    const { body: leadInbox } = await leader.get('/notifications').expect(200);
    expect(leadInbox.notifications[0]).toMatchObject({ type: 'invite-accepted', role: 'Frontend developer' });
  });

  it('saying no to the new role leaves them out of the team', async () => {
    const { leader, member, team } = await setUp();
    const request = await ask(member, team._id, 'Designer');
    await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted', role: 'Frontend developer' }).expect(200);

    await member.patch(`/teams/invites/${request._id}`).send({ status: 'declined' }).expect(200);

    expect((await Team.findById(team._id)).members).toHaveLength(1);
    const { body: incoming } = await leader.get('/teams/requests/incoming').expect(200);
    expect(incoming[0]).toMatchObject({ status: 'declined', askedRole: 'Designer' });
  });

  it('the role they asked for joins straight away', async () => {
    const { leader, member, team } = await setUp();
    const request = await ask(member, team._id, 'Designer');

    const { body } = await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted', role: 'designer' }).expect(200);

    expect(body).toEqual({ _id: request._id, status: 'accepted', role: 'Designer' });
    expect((await Team.findById(team._id)).members).toHaveLength(2);
  });

  it('refuses a role that is not open and leaves the request pending', async () => {
    const { leader, member, team } = await setUp();
    const request = await ask(member, team._id, 'Designer');

    const wrong = await leader.patch(`/teams/requests/${request._id}`).send({ status: 'accepted', role: 'Mascot' }).expect(400);

    expect(wrong.body).toEqual({ error: 'Pick one of the open roles: Frontend developer, Designer' });
    const { body: incoming } = await leader.get('/teams/requests/incoming').expect(200);
    expect(incoming[0].status).toBe('pending');
  });
});

describe('one-click invites from suggested teammates', () => {
  it('invites someone by their id, and the matches then show them as invited', async () => {
    const { leader, member, team } = await setUp({ ...TEAM, skills: ['Vue.js'] });
    await member.patch('/me').send({ skills: ['Vue.js'] }).expect(200);
    const { body: before } = await leader.get(`/teams/${team._id}/matches`).expect(200);
    expect(before[0].pending).toBeNull();

    const sent = await leader.post(`/teams/${team._id}/invites`).send({ userId: before[0]._id, role: 'Designer' }).expect(201);
    expect(sent.body.status).toBe('pending');

    const { body: after } = await leader.get(`/teams/${team._id}/matches`).expect(200);
    expect(after[0].pending).toBe('invited');
    const { body: invites } = await member.get('/teams/invites').expect(200);
    expect(invites[0]).toMatchObject({ role: 'Designer' });
  });

  it('shows the invite on the team, still open for requests; only the team sees who it is', async () => {
    const { leader, member, team } = await setUp();
    const memberId = String((await member.get('/me')).body.user._id);
    await leader.post(`/teams/${team._id}/invites`).send({ userId: memberId, role: 'Designer' }).expect(201);

    const { body: mine } = await leader.get('/teams/mine').expect(200);
    expect(mine[0].pendingInvites).toEqual([{ role: 'Designer', user: expect.objectContaining({ _id: memberId, displayName: expect.any(String) }) }]);
    expect(mine[0].openRoles).toEqual(['Frontend developer', 'Designer']);

    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const { body: browse } = await outsider.get('/teams').expect(200);
    expect(browse.find((t) => t._id === team._id).pendingInvites).toEqual([{ role: 'Designer', user: null }]);
    await outsider.post(`/teams/${team._id}/requests`).send({ role: 'Designer' }).expect(201);

    // the lead also sees who asked for each role; nobody else does
    const { body: after } = await leader.get('/teams/mine').expect(200);
    expect(after[0].pendingRequests).toEqual([
      { _id: expect.any(String), role: 'Designer', user: expect.objectContaining({ displayName: expect.any(String) }) },
    ]);
    const { body: theirs } = await outsider.get('/teams').expect(200);
    expect(theirs.find((t) => t._id === team._id).pendingRequests).toEqual([]);
  });

  it('refuses a bad or unknown id', async () => {
    const { leader, team } = await setUp();
    await leader.post(`/teams/${team._id}/invites`).send({ userId: 'nope', role: 'Designer' }).expect(400);
    const missing = await leader.post(`/teams/${team._id}/invites`).send({ userId: '507f1f77bcf86cd799439011', role: 'Designer' }).expect(404);
    expect(missing.body.error).toBe('This person is no longer on TechTrek');
  });
});

describe('inviting someone for an open role', () => {
  it('needs one of the open roles, and joining with the invite fills that role', async () => {
    const { leader, member, team } = await setUp();

    const noRole = await leader.post(`/teams/${team._id}/invites`).send({ userName: 'member@smu.edu.sg' }).expect(400);
    expect(noRole.body).toEqual({ error: 'Pick which open role you are inviting them for: Frontend developer, Designer' });

    const invite = (await leader
      .post(`/teams/${team._id}/invites`)
      .send({ userName: 'member@smu.edu.sg', role: 'designer' })
      .expect(201)).body;

    const { body: invites } = await member.get('/teams/invites').expect(200);
    expect(invites[0].role).toBe('Designer');
    const { body: inbox } = await member.get('/notifications').expect(200);
    expect(inbox.notifications[0]).toMatchObject({ type: 'invite-received', role: 'Designer' });

    await member.patch(`/teams/invites/${invite._id}`).send({ status: 'accepted' }).expect(200);

    const saved = await Team.findById(team._id);
    expect(saved.members.map((m) => m.role)).toEqual(['Team lead', 'Designer']);
    expect(saved.openRoles).toEqual(['Frontend developer']);
    const { body: leadInbox } = await leader.get('/notifications').expect(200);
    expect(leadInbox.notifications[0]).toMatchObject({ type: 'invite-accepted', role: 'Designer' });
  });

  it('still invites without a role when the team lists none', async () => {
    const { leader, team } = await setUp({ ...TEAM, openRoles: [] });
    await loginAs(app, { userName: 'friend@smu.edu.sg' });

    await leader.post(`/teams/${team._id}/invites`).send({ userName: 'friend@smu.edu.sg' }).expect(201);
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
