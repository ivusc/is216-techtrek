import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');

const PASSWORD = 'Password1!';
const TEAM = { name: 'Byte Me', eventName: 'Hack&Roll', teamSize: 3, openSlots: 1, pitch: 'Build' };

describe('registering', () => {
  it('derives the display name from the SMU email', async () => {
    const response = await request(app)
      .post('/register')
      .send({ userName: 'kellie.jubela.2025@smu.edu.sg', password: PASSWORD })
      .expect(201);

    expect(response.body.user.displayName).toBe('Kellie Jubela 2025');
  });

  it('only accepts SMU emails', async () => {
    await request(app)
      .post('/register')
      .send({ userName: 'someone@gmail.com', password: PASSWORD })
      .expect(400);
  });
});

describe('PATCH /me', () => {
  it('stores the profile fields and returns them from /me', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    const changes = {
      displayName: 'Kellie Jubela',
      year: 1,
      course: 'Information Systems',
      about: 'Builds things people actually use.',
      openToTeams: false,
      githubUrl: 'https://github.com/kelliej',
      linkedinUrl: 'https://www.linkedin.com/in/kellie-jubela',
    };

    await agent.patch('/me').send(changes).expect(200);
    const response = await agent.get('/me').expect(200);

    expect(response.body.user).toMatchObject(changes);
  });

  it('clears an optional field sent blank', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await agent.patch('/me').send({ githubUrl: 'https://github.com/kelliej', year: 2 }).expect(200);

    const response = await agent.patch('/me').send({ githubUrl: '', year: '' }).expect(200);

    expect(response.body.user).not.toHaveProperty('githubUrl');
    expect(response.body.user).not.toHaveProperty('year');
  });

  it.each([
    ['a year above 4', { year: 7 }],
    ['a fractional year', { year: 1.5 }],
    ['a blank display name', { displayName: ' ' }],
    ['an about longer than 500 characters', { about: 'x'.repeat(501) }],
    ['a script URL as GitHub', { githubUrl: 'javascript:alert(1)//https://github.com/x' }],
    ['a look-alike GitHub host', { githubUrl: 'https://github.com.evil.tld/x' }],
    ['a look-alike LinkedIn host', { linkedinUrl: 'https://www.linkedin.com.evil.tld/in/x' }],
    ['a password change', { password: 'Password2!' }],
    ['a username change', { newUserName: 'other@smu.edu.sg' }],
    ['skills that are not a list', { skills: 'React' }],
    ['more than 12 skills', { skills: Array.from({ length: 13 }, (_, index) => `Skill ${index}`) }],
    ['a missing teammate finder choice', { openToTeams: null }],
  ])('rejects %s', async (label, changes) => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent.patch('/me').send(changes).expect(400);
  });
});

describe('Telegram username', () => {
  it('saves it without the @, refuses a bad one, and clears it when blank', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    const saved = await agent.patch('/me').send({ telegram: '@kellie_j' }).expect(200);
    expect(saved.body.user.telegram).toBe('kellie_j');

    const bad = await agent.patch('/me').send({ telegram: 'a b' }).expect(400);
    expect(bad.body.error).toContain('Telegram username');

    const cleared = await agent.patch('/me').send({ telegram: '' }).expect(200);
    expect(cleared.body.user.telegram).toBeUndefined();
  });
});

describe('PATCH /me/password', () => {
  it('refuses a wrong current password without ending the session', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent
      .patch('/me/password')
      .send({ currentPassword: 'Nope1234!', newPassword: 'Password2!' })
      .expect(403);

    expect((await agent.get('/me')).body.isAuthenticated).toBe(true);
  });

  it('rejects a new password shorter than eight characters', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent
      .patch('/me/password')
      .send({ currentPassword: PASSWORD, newPassword: 'short' })
      .expect(400);
  });

  it('changes the password', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent
      .patch('/me/password')
      .send({ currentPassword: PASSWORD, newPassword: 'Password2!' })
      .expect(204);

    await request(app)
      .post('/login')
      .send({ userName: 'kellie.jubela@smu.edu.sg', password: 'Password2!' })
      .expect(200);
  });
});

describe('DELETE /me', () => {
  it('refuses a wrong password and keeps the account', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent.delete('/me').send({ password: 'Nope1234!' }).expect(403);

    expect(await User.countDocuments()).toBe(1);
  });

  it('deletes the account with its requests and led teams and reopens joined teams', async () => {
    const leaving = await loginAs(app, { userName: 'leaving@smu.edu.sg' });
    const otherLeader = await loginAs(app, { userName: 'other.leader@smu.edu.sg' });
    const applicant = await loginAs(app, { userName: 'applicant@smu.edu.sg' });
    const thirdLeader = await loginAs(app, { userName: 'third.leader@smu.edu.sg' });
    const leavingUser = await User.findOne({ userName: 'leaving@smu.edu.sg' });

    const joined = (await otherLeader.post('/teams').send(TEAM).expect(201)).body;
    await leaving.post(`/teams/${joined._id}/requests`).send({}).expect(201);
    const joinRequest = await TeamRequest.findOne({ teamId: joined._id });
    await otherLeader
      .patch(`/teams/requests/${joinRequest._id}`)
      .send({ status: 'accepted' })
      .expect(200);
    expect((await Team.findById(joined._id)).status).toBe('closed');

    const led = (await leaving.post('/teams').send(TEAM).expect(201)).body;
    await applicant.post(`/teams/${led._id}/requests`).send({}).expect(201);
    const pending = (await thirdLeader.post('/teams').send(TEAM).expect(201)).body;
    await leaving.post(`/teams/${pending._id}/requests`).send({}).expect(201);

    await leaving.delete('/me').send({ password: PASSWORD }).expect(204);

    expect(await User.findById(leavingUser._id)).toBeNull();
    expect(await TeamRequest.countDocuments({ userId: leavingUser._id })).toBe(0);
    expect(await Team.findById(led._id)).toBeNull();
    expect(await TeamRequest.countDocuments({ teamId: led._id })).toBe(0);
    const reopened = await Team.findById(joined._id);
    expect(reopened.status).toBe('open');
    expect(reopened.members.map((member) => String(member.userId))).not.toContain(
      String(leavingUser._id),
    );
    expect((await leaving.get('/me')).body.isAuthenticated).toBe(false);
  });
});
