import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 4, openSlots: 2, pitch: 'Build' };

describe('teams identity', () => {
  it('makes the session user the leader whatever userId the body carries', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    await loginAs(app, { userName: 'someone.else@smu.edu.sg' });
    const other = await User.findOne({ userName: 'someone.else@smu.edu.sg' });
    const me = await User.findOne({ userName: 'leader@smu.edu.sg' });

    await leader
      .post('/teams')
      .send({ ...TEAM, userId: String(other._id) })
      .expect(201);

    const team = await Team.findOne();
    expect(String(team.leaderId)).toBe(String(me._id));
  });
});

describe('answering join requests', () => {
  async function pendingRequest() {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    const created = await leader.post('/teams').send(TEAM).expect(201);
    await member.post(`/teams/${created.body._id}/requests`).send({ role: 'Designer' }).expect(201);
    const joinRequest = await TeamRequest.findOne();
    return { leader, teamId: created.body._id, requestId: String(joinRequest._id) };
  }

  it('refuses to accept the same request twice', async () => {
    const { leader, teamId, requestId } = await pendingRequest();

    await leader.patch(`/teams/requests/${requestId}`).send({ status: 'accepted' }).expect(200);
    await leader.patch(`/teams/requests/${requestId}`).send({ status: 'accepted' }).expect(409);

    const team = await Team.findById(teamId);
    expect(team.members).toHaveLength(2);
  });

  it('rejects a status other than accepted or declined', async () => {
    const { leader, requestId } = await pendingRequest();

    await leader.patch(`/teams/requests/${requestId}`).send({ status: 'maybe' }).expect(400);

    expect((await TeamRequest.findById(requestId)).status).toBe('pending');
  });
  it('accepts a request once when answers race', async () => {
    const { leader, teamId, requestId } = await pendingRequest();

    const answers = await Promise.all(
      [1, 2, 3].map(() =>
        leader.patch(`/teams/requests/${requestId}`).send({ status: 'accepted' }),
      ),
    );

    expect(answers.map((answer) => answer.status).sort()).toEqual([200, 409, 409]);
    expect((await Team.findById(teamId)).members).toHaveLength(2);
  });
});
