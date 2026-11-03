import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const TeamRequest = require('../models/TeamRequest');

const TEAM = {
  name: 'Byte Me',
  eventName: 'Hack&Roll',
  teamSize: 5,
  openSlots: 3,
  pitch: 'Build',
  skills: ['Vue.js', 'Figma'],
};

async function userWith(userName, profile) {
  const agent = await loginAs(app, { userName });
  await agent.patch('/me').send(profile).expect(200);
  return agent;
}

describe('GET /teams/:id/matches', () => {
  it('ranks open-to-teams users by how many wanted skills they have', async () => {
    const leader = await userWith('leader@smu.edu.sg', { skills: ['Vue.js', 'Figma'] });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;
    await userWith('strong.match@smu.edu.sg', { skills: ['vue.js', 'FIGMA', 'Python'] });
    await userWith('weak.match@smu.edu.sg', { skills: ['Vue.js', 'Rust'] });
    await userWith('hidden.match@smu.edu.sg', { skills: ['Vue.js'], openToTeams: false });
    await userWith('no.match@smu.edu.sg', { skills: ['Rust'] });
    const member = await userWith('member@smu.edu.sg', { skills: ['Figma'] });
    await member.post(`/teams/${team._id}/requests`).send({}).expect(201);
    const joinRequest = await TeamRequest.findOne();
    await leader
      .patch(`/teams/requests/${joinRequest._id}`)
      .send({ status: 'accepted' })
      .expect(200);

    const response = await leader.get(`/teams/${team._id}/matches`).expect(200);

    expect(response.body.map((match) => [match.displayName, match.matchedSkills])).toEqual([
      ['Strong Match', ['Vue.js', 'Figma']],
      ['Weak Match', ['Vue.js']],
    ]);
    for (const match of response.body) {
      expect(match).not.toHaveProperty('userName');
      expect(match).not.toHaveProperty('password');
      expect(match).not.toHaveProperty('skills');
    }
  });

  it('is only for the team leader', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const outsider = await loginAs(app, { userName: 'outsider@smu.edu.sg' });
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;

    await outsider.get(`/teams/${team._id}/matches`).expect(403);
  });

  it('is only for teams that are open', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    await userWith('strong.match@smu.edu.sg', { skills: ['Vue.js'] });
    const draft = (
      await leader
        .post('/teams')
        .send({ ...TEAM, status: 'draft' })
        .expect(201)
    ).body;

    await leader.get(`/teams/${draft._id}/matches`).expect(409);
  });
});
