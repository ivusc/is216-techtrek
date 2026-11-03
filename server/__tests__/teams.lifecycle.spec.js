import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const app = require('../app');
const Opportunity = require('../models/Opportunity');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const DAY = 24 * 60 * 60 * 1000;
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

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

describe('POST /teams', () => {
  it('answers 400 for a team without a pitch', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });

    const response = await leader
      .post('/teams')
      .send({ ...TEAM, pitch: undefined })
      .expect(400);

    expect(response.body.error).toMatch(/pitch/);
    expect(await Team.countDocuments()).toBe(0);
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
});

describe('GET /teams', () => {
  it("never exposes anyone's email", async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const privateRequester = await loginAs(app, { userName: 'private.requester@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
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

describe('PATCH /teams/:id', () => {
  it.each([
    ['negative open', { openSlots: -3 }],
    ['fractional open', { openSlots: 1.5 }],
    ['too many open', { teamSize: 2, openSlots: 2 }],
  ])('rejects %s slots', async (label, change) => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
    await join(leader, member, team._id);

    const response = await leader.patch(`/teams/${team._id}`).send(change).expect(400);

    expect(response.body.error).toBe('Invalid slots configuration');
    const stored = await Team.findById(team._id);
    expect([stored.teamSize, stored.externalMembers, stored.members.length]).toEqual([4, 1, 2]);
  });

  it('publishes a draft', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const draft = (
      await leader
        .post('/teams')
        .send({ ...TEAM, status: 'draft' })
        .expect(201)
    ).body;
    const open = (
      await leader
        .post('/teams')
        .send({ ...TEAM, name: 'Already Open' })
        .expect(201)
    ).body;

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
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
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
    const team = (
      await leader
        .post('/teams')
        .send({ ...TEAM, eventLocation: 'NUS', closesAt: '2027-01-15' })
        .expect(201)
    ).body;

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
    const team = (
      await leader
        .post('/teams')
        .send({ ...TEAM, eventName: undefined, opportunityId: String(event._id) })
        .expect(201)
    ).body;

    const response = await leader
      .patch(`/teams/${team._id}`)
      .send({ opportunityId: null, eventName: 'SMU Code Fest' })
      .expect(200);

    expect(response.body.event).toEqual({ name: 'SMU Code Fest', location: 'NUS' });
    expect(response.body.closesAt).toBe(event.deadline.toISOString());
  });

  it('answers 400 for an event id that is not an id', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
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
    const emptied = (
      await leader
        .post('/teams')
        .send({ ...TEAM, status: 'draft' })
        .expect(201)
    ).body;
    const untouched = (
      await leader
        .post('/teams')
        .send({ ...TEAM, name: 'Second Draft', status: 'draft' })
        .expect(201)
    ).body;
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
