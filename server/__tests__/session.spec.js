import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { loginAs, sessionCookie } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');

const MINUTE = 60 * 1000;
const START = new Date('2026-11-03T08:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

async function stayActiveFor(agent, minutes) {
  for (let elapsed = 30; elapsed <= minutes; elapsed += 30) {
    vi.setSystemTime(START + elapsed * MINUTE);
    await agent.get('/application').expect(200);
  }
}

describe('session lifetime', () => {
  it('keeps an active session alive past an hour', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await stayActiveFor(agent, 11 * 60 + 30);

    const response = await agent.get('/me').expect(200);
    expect(response.body.isAuthenticated).toBe(true);
  });

  it('ends a session twelve hours after login however active it is', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await stayActiveFor(agent, 11 * 60 + 30);

    vi.setSystemTime(START + (12 * 60 + 10) * MINUTE);
    const response = await agent.get('/application').expect(401);

    expect(sessionCookie(response)).toMatch(/^connect\.sid=;/);
  });

  it('reports a session past the cap as logged out on /me', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await stayActiveFor(agent, 11 * 60 + 30);

    vi.setSystemTime(START + (12 * 60 + 10) * MINUTE);
    const response = await agent.get('/me').expect(200);

    expect(response.body).toEqual({ isAuthenticated: false, user: null });
  });
});

describe('body parsing', () => {
  it('does not read form-encoded bodies', async () => {
    await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await request(app)
      .post('/login')
      .type('form')
      .send({ userName: 'kellie.jubela@smu.edu.sg', password: 'Password1!' })
      .expect(400);
  });
});
