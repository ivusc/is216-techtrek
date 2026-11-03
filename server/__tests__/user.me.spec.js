import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs, sessionCookie } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Team = require('../models/Team');

const PASSWORD = 'Password1!';

describe('GET /me', () => {
  it('reports logged out and clears the cookie once the account is gone', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await User.deleteMany({});

    const response = await agent.get('/me').expect(200);

    expect(response.body).toEqual({ isAuthenticated: false, user: null });
    expect(sessionCookie(response)).toMatch(/^connect\.sid=;.*Expires=Thu, 01 Jan 1970/);
  });

  it('reads the profile from the database, without the password', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await User.updateOne({ userName: 'kellie.jubela@smu.edu.sg' }, { skills: ['Figma'] });

    const response = await agent.get('/me').expect(200);

    expect(response.body.user.skills).toEqual(['Figma']);
    expect(response.body.user).not.toHaveProperty('password');
  });
});

describe('PATCH /me', () => {
  it('trims and de-duplicates skills', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent
      .patch('/me')
      .send({ skills: [' vue ', 'Vue', ''] })
      .expect(200);

    const stored = await User.findOne({ userName: 'kellie.jubela@smu.edu.sg' });
    expect(stored.skills).toEqual(['vue']);
  });
});

describe('sessions', () => {
  it('rejects another session of an account that was deleted', async () => {
    const first = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    const second = request.agent(app);
    await second
      .post('/login')
      .send({ userName: 'kellie.jubela@smu.edu.sg', password: PASSWORD })
      .expect(200);

    await first.delete('/me').send({ password: PASSWORD }).expect(204);
    await second
      .post('/teams')
      .send({ name: 'Ghosts', eventName: 'Hack', teamSize: 3, openSlots: 1, pitch: 'Boo' })
      .expect(401);

    expect(await Team.countDocuments()).toBe(0);
  });

  it('issues a new session id on login', async () => {
    const agent = request.agent(app);
    const registered = await agent
      .post('/register')
      .send({ userName: 'first.user@smu.edu.sg', password: PASSWORD })
      .expect(201);
    await request(app)
      .post('/register')
      .send({ userName: 'second.user@smu.edu.sg', password: PASSWORD })
      .expect(201);

    const loggedIn = await agent
      .post('/login')
      .send({ userName: 'second.user@smu.edu.sg', password: PASSWORD })
      .expect(200);

    const sessionId = (response) => sessionCookie(response)?.split(';')[0];
    expect(sessionId(loggedIn)).toBeDefined();
    expect(sessionId(loggedIn)).not.toBe(sessionId(registered));
  });
});
