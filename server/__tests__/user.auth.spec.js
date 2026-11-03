import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs, sessionCookie } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');

const EMAIL = 'kellie.jubela@smu.edu.sg';
const PASSWORD = 'Password1!';

describe('POST /register', () => {
  it('answers 400 and the exact message for an email already registered', async () => {
    await request(app).post('/register').send({ userName: EMAIL, password: PASSWORD }).expect(201);

    const response = await request(app)
      .post('/register')
      .send({ userName: EMAIL, password: PASSWORD })
      .expect(400);

    expect(response.body).toEqual({ error: 'Username already exists.' });
    expect(await User.countDocuments()).toBe(1);
  });

  it.each([
    [
      'a password of only spaces',
      { userName: EMAIL, password: '        ' },
      { error: 'Password cannot be blank or only contain spaces!' },
    ],
    [
      'a seven-character password',
      { userName: EMAIL, password: 'Passwo1' },
      { error: 'Password must be at least 8 characters long!' },
    ],
    [
      'a userName that is not a string',
      { userName: 42, password: PASSWORD },
      { error: 'UserName or Password was empty' },
    ],
    [
      'an SMU school subdomain',
      { userName: 'someone@scis.smu.edu.sg', password: PASSWORD },
      { error: expect.stringContaining('Please use your @smu.edu.sg email.') },
    ],
  ])('rejects %s', async (label, body, expected) => {
    const response = await request(app).post('/register').send(body).expect(400);

    expect(response.body).toEqual(expected);
    expect(await User.countDocuments()).toBe(0);
  });

  it('stores the email trimmed and lower-cased', async () => {
    await request(app)
      .post('/register')
      .send({ userName: '  Kellie.Jubela@SMU.edu.sg ', password: PASSWORD })
      .expect(201);

    const stored = await User.findOne();
    expect(stored.userName).toBe(EMAIL);
  });
});

describe('POST /login', () => {
  it('answers 404 for an unknown email', async () => {
    const response = await request(app)
      .post('/login')
      .send({ userName: 'nobody@smu.edu.sg', password: PASSWORD })
      .expect(404);

    expect(response.body).toEqual({ error: 'User not found.' });
  });

  it('answers 401 for a wrong password and sets no cookie', async () => {
    await loginAs(app, { userName: EMAIL });

    const response = await request(app)
      .post('/login')
      .send({ userName: EMAIL, password: 'Password2!' })
      .expect(401);

    expect(response.body).toEqual({ error: 'Wrong password.' });
    expect(sessionCookie(response)).toBeUndefined();
  });

  it('accepts the email in any case with surrounding spaces', async () => {
    await loginAs(app, { userName: EMAIL });

    const response = await request(app)
      .post('/login')
      .send({ userName: ' Kellie.JUBELA@smu.edu.sg  ', password: PASSWORD })
      .expect(200);

    expect(response.body.user.userName).toBe(EMAIL);
    expect(response.body.user).not.toHaveProperty('password');
    expect(sessionCookie(response)).toBeDefined();
  });

  it('rejects a non-string body', async () => {
    const response = await request(app)
      .post('/login')
      .send({ userName: ['x'], password: 1 })
      .expect(400);

    expect(response.body).toEqual({ error: 'UserName or Password was empty' });
  });
});

describe('POST /logout', () => {
  it('ends the session and clears the cookie', async () => {
    const agent = await loginAs(app, { userName: EMAIL });
    const [cookie] = sessionCookie(await agent.get('/me').expect(200)).split(';');

    const response = await agent.post('/logout').expect(204);

    expect(sessionCookie(response)).toMatch(/^connect\.sid=;/);
    const replayed = await request(app).get('/me').set('Cookie', cookie).expect(200);
    expect(replayed.body).toEqual({ isAuthenticated: false, user: null });
  });

  it('is fine without a session', async () => {
    await request(app).post('/logout').expect(204);
  });
});

describe('requireLogin', () => {
  it.each([
    ['GET', '/application'],
    ['GET', '/interview/dashboard'],
    ['GET', '/teams'],
    ['PATCH', '/me'],
    ['PUT', '/me/avatar'],
    ['GET', '/users/x/avatar'],
  ])('answers 401 on %s %s without a session', async (method, path) => {
    const response = await request(app)[method.toLowerCase()](path).expect(401);

    expect(response.body).toEqual({ error: 'Please log in first.' });
  });
});
