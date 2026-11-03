import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const app = require('../app');
const Opportunity = require('../models/Opportunity');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const DAY = 24 * 60 * 60 * 1000;
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

afterEach(() => {
  vi.useRealTimers();
});

function hackathon(overrides = {}) {
  return Opportunity.create({
    source: 'devpost',
    externalId: '101',
    type: 'hackathon',
    title: 'NUS Hack 2027',
    organisation: 'NUS Hackers',
    location: 'NUS',
    url: 'https://nushack.devpost.com',
    deadline: new Date(Date.now() + 30 * DAY),
    ...overrides,
  });
}

async function join(leader, member, teamId) {
  await member.post(`/teams/${teamId}/requests`).send({ role: 'Designer' }).expect(201);
  const joinRequest = await TeamRequest.findOne({ teamId, status: 'pending' });
  await leader.patch(`/teams/requests/${joinRequest._id}`).send({ status: 'accepted' }).expect(200);
}

async function post(agent, team) {
  return (await agent.post('/teams').send(team).expect(201)).body;
}

describe('POST /teams', () => {
  it('creates an open team led by me with the right external member count', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    const response = await leader.post('/teams').send(TEAM).expect(201);

    expect(response.body).toMatchObject({
      status: 'open',
      teamSize: 4,
      externalMembers: 1,
      slotsOpen: 2,
      isLeader: true,
      leader: { displayName: 'Leader' },
      members: [{ role: 'Team lead', user: { displayName: 'Leader' } }],
    });
    expect(response.body.members).toHaveLength(1);
  });

  it('saves a draft that nobody else sees', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });

    await post(leader, { ...TEAM, status: 'draft' });

    expect((await outsider.get('/teams').expect(200)).body).toEqual([]);
    const mine = (await leader.get('/teams/mine').expect(200)).body;
    expect(mine.map((team) => team.status)).toEqual(['draft']);
  });

  it.each([
    ['zero open slots', { openSlots: 0 }],
    ['as many open slots as seats', { openSlots: 4 }],
    ['a fractional team size', { teamSize: 3.5 }],
  ])('rejects %s', async (label, change) => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    const response = await leader
      .post('/teams')
      .send({ ...TEAM, ...change })
      .expect(400);

    expect(response.body.error).toBe('Invalid slots configuration');
    expect(await Team.countDocuments()).toBe(0);
  });

  it('answers 400 for a team without a pitch', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    const response = await leader
      .post('/teams')
      .send({ ...TEAM, pitch: undefined })
      .expect(400);

    expect(response.body.error).toMatch(/pitch/);
    expect(await Team.countDocuments()).toBe(0);
  });

  it('takes the event from an opportunity', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const event = await hackathon();

    const linked = await leader
      .post('/teams')
      .send({ ...TEAM, eventName: undefined, opportunityId: String(event._id) })
      .expect(201);
    const unknown = await leader
      .post('/teams')
      .send({ ...TEAM, opportunityId: String(new mongoose.Types.ObjectId()) })
      .expect(404);

    expect(linked.body.event).toEqual({
      opportunityId: String(event._id),
      name: 'NUS Hack 2027',
      location: 'NUS',
    });
    expect(linked.body.closesAt).toBe(event.deadline.toISOString());
    expect(unknown.body.error).toBe('Event not found');
    expect(await Team.countDocuments()).toBe(1);
  });

  it('answers 400 for a malformed event id', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    await hackathon();

    const response = await leader
      .post('/teams')
      .send({ ...TEAM, opportunityId: 'nope' })
      .expect(400);
    const injected = await leader
      .post('/teams')
      .send({ ...TEAM, opportunityId: { $ne: null } })
      .expect(400);

    expect(await Team.countDocuments()).toBe(0);
    expect(injected.body.error).toBe('Invalid ID');
    expect(response.body.error).toBe('Invalid ID');
  });

  it('cleans the wanted skills', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    const team = await post(leader, { ...TEAM, skills: [' Vue.js ', 'vue.js', 'Figma'] });

    expect(team.skills).toEqual(['Vue.js', 'Figma']);
  });
});

describe('GET /teams', () => {
  it("lists other people's open and closed teams that have not closed yet, soonest first", async () => {
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const alice = await loginAs(app, { userName: 'alice@smu.edu.sg' });
    const bob = await loginAs(app, { userName: 'bob@smu.edu.sg' });
    const carol = await loginAs(app, { userName: 'carol@smu.edu.sg' });
    const inDays = (days) => new Date(Date.now() + days * DAY);

    await post(me, { ...TEAM, name: 'Mine', closesAt: inDays(5) });
    const joined = await post(alice, { ...TEAM, name: 'Joined', closesAt: inDays(6) });
    await join(alice, me, joined._id);
    await post(alice, { ...TEAM, name: 'Draft', status: 'draft', closesAt: inDays(2) });
    await post(alice, { ...TEAM, name: 'Expired', closesAt: inDays(-1) });
    await post(bob, { ...TEAM, name: 'Later', closesAt: inDays(10) });
    const full = await post(bob, {
      ...TEAM,
      name: 'Full Soon',
      teamSize: 2,
      openSlots: 1,
      closesAt: inDays(3),
    });
    await join(bob, carol, full._id);
    await post(alice, { ...TEAM, name: 'Soonest', closesAt: inDays(1) });

    const response = await me.get('/teams').expect(200);

    expect(response.body.map((team) => [team.name, team.status])).toEqual([
      ['Soonest', 'open'],
      ['Full Soon', 'closed'],
      ['Later', 'open'],
    ]);
  });

  it('marks my pending request', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const asked = await post(leader, TEAM);
    await post(leader, { ...TEAM, name: 'Not Asked' });
    await me.post(`/teams/${asked._id}/requests`).send({ role: 'Designer' }).expect(201);

    const response = await me.get('/teams').expect(200);

    expect(
      Object.fromEntries(response.body.map((team) => [team.name, team.requestStatus])),
    ).toEqual({ 'Byte Me': 'pending', 'Not Asked': null });
  });

  it("never exposes anyone's email", async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const privateRequester = await loginAs(app, { userName: 'private.requester@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const team = await post(leader, TEAM);
    await join(leader, member, team._id);
    await privateRequester
      .post(`/teams/${team._id}/requests`)
      .send({ role: 'Designer', shareProfile: false })
      .expect(201);

    const bodies = [
      (await outsider.get('/teams').expect(200)).body,
      (await leader.get('/teams/mine').expect(200)).body,
      (await leader.get('/teams/requests/incoming').expect(200)).body,
      (await privateRequester.get('/teams/requests/sent').expect(200)).body,
      (await member.get('/teams/requests/sent').expect(200)).body,
    ];

    expect(bodies.map((body) => body.length)).toEqual([1, 1, 2, 1, 1]);
    expect(JSON.stringify(bodies)).not.toContain('@smu.edu.sg');
  });
});

describe('GET /teams/mine', () => {
  it('lists teams I lead and teams I joined, drafts included, most recently edited first', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T08:00:00Z'));
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const alice = await loginAs(app, { userName: 'alice@smu.edu.sg' });
    const draft = await post(me, { ...TEAM, name: 'Led Draft', status: 'draft' });
    vi.setSystemTime(new Date('2026-11-03T08:01:00Z'));
    const joined = await post(alice, { ...TEAM, name: 'Joined' });
    await join(alice, me, joined._id);
    await post(alice, { ...TEAM, name: 'Not Mine' });
    vi.setSystemTime(new Date('2026-11-03T08:02:00Z'));
    await post(me, { ...TEAM, name: 'Led Open' });

    const before = (await me.get('/teams/mine').expect(200)).body;
    vi.setSystemTime(new Date('2026-11-03T08:03:00Z'));
    await me.patch(`/teams/${draft._id}`).send({ pitch: 'Build faster' }).expect(200);
    const after = (await me.get('/teams/mine').expect(200)).body;

    expect(before.map((team) => team.name)).toEqual(['Led Open', 'Joined', 'Led Draft']);
    expect(after.map((team) => team.name)).toEqual(['Led Draft', 'Led Open', 'Joined']);
    expect(after.map((team) => team.isLeader)).toEqual([true, true, false]);
  });
});

describe('GET /teams/events', () => {
  it('lists upcoming hackathons and competitions only', async () => {
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const upcoming = await hackathon();
    await hackathon({
      externalId: '102',
      title: 'Last Year',
      deadline: new Date(Date.now() - DAY),
    });
    await Opportunity.create({
      source: 'manual',
      type: 'competition',
      title: 'Case Comp',
      organisation: 'SMU',
      location: 'SMU',
    });
    await Opportunity.create({
      source: 'manual',
      type: 'job',
      title: 'Frontend Intern',
      organisation: 'Acme',
    });

    const response = await me.get('/teams/events').expect(200);

    expect(response.body).toEqual([
      { _id: expect.any(String), title: 'Case Comp', organisation: 'SMU', location: 'SMU' },
      {
        _id: String(upcoming._id),
        title: 'NUS Hack 2027',
        organisation: 'NUS Hackers',
        location: 'NUS',
        deadline: upcoming.deadline.toISOString(),
      },
    ]);
  });
});

describe('PATCH /teams/:id', () => {
  it('lets the leader edit and reopens the team when slots grow', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const team = await post(leader, { ...TEAM, teamSize: 2, openSlots: 1 });
    await join(leader, member, team._id);
    expect((await Team.findById(team._id)).status).toBe('closed');

    const response = await leader
      .patch(`/teams/${team._id}`)
      .send({ name: 'Byte Me Too', pitch: 'Build more', teamSize: 3, openSlots: 1 })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Byte Me Too',
      pitch: 'Build more',
      status: 'open',
      teamSize: 3,
      externalMembers: 0,
      slotsOpen: 1,
    });
  });

  it('is only for the leader', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const team = await post(leader, TEAM);

    const response = await outsider
      .patch(`/teams/${team._id}`)
      .send({ name: 'Taken Over' })
      .expect(403);

    expect(response.body.error).toBe('Only leader can edit');
    expect((await Team.findById(team._id)).name).toBe('Byte Me');
  });

  it.each([
    ['negative open', { openSlots: -3 }],
    ['fractional open', { openSlots: 1.5 }],
    ['too many open', { teamSize: 2, openSlots: 2 }],
  ])('rejects %s slots', async (label, change) => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const team = await post(leader, TEAM);
    await join(leader, member, team._id);

    const response = await leader.patch(`/teams/${team._id}`).send(change).expect(400);

    expect(response.body.error).toBe('Invalid slots configuration');
    const stored = await Team.findById(team._id);
    expect([stored.teamSize, stored.externalMembers, stored.members.length]).toEqual([4, 1, 2]);
  });

  it('publishes a draft', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const draft = await post(leader, { ...TEAM, status: 'draft' });
    const open = await post(leader, { ...TEAM, name: 'Already Open' });

    const published = await leader
      .patch(`/teams/${draft._id}`)
      .send({ status: 'open' })
      .expect(200);
    const kept = await leader.patch(`/teams/${open._id}`).send({ status: 'draft' }).expect(200);

    expect(published.body.status).toBe('open');
    expect(kept.body.status).toBe('open');
    const browsed = (await outsider.get('/teams').expect(200)).body;
    expect(browsed.map((listed) => listed.name).sort()).toEqual(['Already Open', 'Byte Me']);
  });

  it('changes the event', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = await post(leader, TEAM);
    const event = await hackathon();

    const typed = await leader
      .patch(`/teams/${team._id}`)
      .send({
        opportunityId: null,
        eventName: 'SMU Code Fest',
        eventLocation: 'SMU SCIS',
        closesAt: '2027-02-01',
      })
      .expect(200);
    const linked = await leader
      .patch(`/teams/${team._id}`)
      .send({ opportunityId: String(event._id) })
      .expect(200);
    const unknown = await leader
      .patch(`/teams/${team._id}`)
      .send({ opportunityId: String(new mongoose.Types.ObjectId()) })
      .expect(404);

    expect(typed.body.event).toMatchObject({ name: 'SMU Code Fest', location: 'SMU SCIS' });
    expect(typed.body.closesAt).toBe('2027-02-01T00:00:00.000Z');
    expect(linked.body.event).toMatchObject({
      opportunityId: String(event._id),
      name: 'NUS Hack 2027',
      location: 'NUS',
    });
    expect(linked.body.closesAt).toBe(event.deadline.toISOString());
    expect(unknown.body.error).toBe('Event not found');
    expect((await Team.findById(team._id)).event.name).toBe('NUS Hack 2027');
  });

  it('keeps the event fields a change leaves out', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = await post(leader, { ...TEAM, eventLocation: 'NUS', closesAt: '2027-01-15' });

    const moved = await leader
      .patch(`/teams/${team._id}`)
      .send({ closesAt: '2027-02-01' })
      .expect(200);
    const renamed = await leader
      .patch(`/teams/${team._id}`)
      .send({ eventName: 'Hack&Roll 2027' })
      .expect(200);

    expect([moved.body.event, moved.body.closesAt]).toEqual([
      { name: 'Hack&Roll', location: 'NUS' },
      '2027-02-01T00:00:00.000Z',
    ]);
    expect([renamed.body.event, renamed.body.closesAt]).toEqual([
      { name: 'Hack&Roll 2027', location: 'NUS' },
      '2027-02-01T00:00:00.000Z',
    ]);
  });

  it('unlinks the event when opportunityId is null', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const event = await hackathon();
    const team = await post(leader, {
      ...TEAM,
      eventName: undefined,
      opportunityId: String(event._id),
    });

    const response = await leader
      .patch(`/teams/${team._id}`)
      .send({ opportunityId: null, eventName: 'SMU Code Fest' })
      .expect(200);

    expect(response.body.event).toEqual({ name: 'SMU Code Fest', location: 'NUS' });
    expect(response.body.closesAt).toBe(event.deadline.toISOString());
  });

  it('answers 400 for an event id that is not an id', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = await post(leader, TEAM);
    await hackathon();

    const response = await leader
      .patch(`/teams/${team._id}`)
      .send({ opportunityId: { $ne: null } })
      .expect(400);

    expect(response.body.error).toBe('Invalid ID');
    expect((await Team.findById(team._id)).event.name).toBe('Hack&Roll');
  });

  it('refuses to publish a draft without an open slot', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const emptied = await post(leader, { ...TEAM, status: 'draft' });
    const untouched = await post(leader, { ...TEAM, name: 'Second Draft', status: 'draft' });
    await leader.patch(`/teams/${emptied._id}`).send({ openSlots: 0 }).expect(200);

    const publishing = await leader
      .patch(`/teams/${emptied._id}`)
      .send({ status: 'open' })
      .expect(400);
    await leader
      .patch(`/teams/${untouched._id}`)
      .send({ status: 'open', openSlots: 0 })
      .expect(400);

    expect(publishing.body.error).toBe('Invalid slots configuration');
    const stored = await Team.find().sort('name');
    expect(stored.map((team) => [team.name, team.status, team.slotsOpen])).toEqual([
      ['Byte Me', 'draft', 0],
      ['Second Draft', 'draft', 2],
    ]);
  });

  it('answers 404 for an unknown team and 400 for a malformed id', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    await leader
      .patch(`/teams/${new mongoose.Types.ObjectId()}`)
      .send({ name: 'Renamed' })
      .expect(404);
    const malformed = await leader.patch('/teams/nope').send({ name: 'Renamed' }).expect(400);

    expect(malformed.body.error).toBe('Invalid ID');
  });
});

describe('DELETE /teams/:id', () => {
  it('deletes the team and its requests', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const team = await post(leader, TEAM);
    await member.post(`/teams/${team._id}/requests`).send({ role: 'Designer' }).expect(201);

    await leader.delete(`/teams/${team._id}`).expect(204);

    expect(await Team.countDocuments()).toBe(0);
    expect(await TeamRequest.countDocuments({ teamId: team._id })).toBe(0);
  });

  it('is only for the leader', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const team = await post(leader, TEAM);

    const response = await outsider.delete(`/teams/${team._id}`).expect(403);

    expect(response.body.error).toBe('Only leader can delete');
    expect(await Team.countDocuments()).toBe(1);
  });
});
