import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(60 * 1024)]);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  randomBytes(16),
]);
const HTML_AS_JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.from('<script>alert(1)</script>'),
]);
const TEAM = {
  name: 'Byte Me',
  eventName: 'Hack&Roll',
  teamSize: 4,
  openSlots: 2,
  pitch: 'Build',
  skills: ['Vue.js'],
};

function upload(agent, bytes, type) {
  return agent.put('/me/avatar').set('Content-Type', type).send(bytes);
}

async function idOf(userName) {
  return String((await User.findOne({ userName }))._id);
}

describe('PUT /me/avatar', () => {
  it('stores a JPEG and serves the same bytes with hardened headers', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    const response = await upload(agent, JPEG, 'image/jpeg').expect(200);
    const served = await agent
      .get(`/users/${await idOf('kellie.jubela@smu.edu.sg')}/avatar`)
      .buffer(true)
      .parse((res, done) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.body.user.avatar.updatedAt).toBeDefined();
    expect(response.body.user.avatar).not.toHaveProperty('data');
    expect(response.body.user.avatar).not.toHaveProperty('contentType');
    expect(Buffer.compare(served.body, JPEG)).toBe(0);
    expect(served.headers['content-type']).toBe('image/jpeg');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(served.headers['cache-control']).toBe('private, max-age=86400');
  });

  it.each([
    ['HTML behind JPEG magic bytes', HTML_AS_JPEG, 'text/html', 400],
    ['PNG bytes labelled as JPEG', PNG, 'image/jpeg', 400],
    ['an SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml', 400],
    ['a file over 100 KB', Buffer.concat([JPEG, randomBytes(50 * 1024)]), 'image/jpeg', 413],
    ['a truncated RIFF header', Buffer.from('RIFF'), 'image/webp', 400],
  ])('rejects %s', async (label, bytes, type, status) => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await upload(agent, bytes, type).expect(status);

    expect((await agent.get('/me')).body.user).not.toHaveProperty('avatar');
  });

  it('needs a session', async () => {
    await upload(request(app), PNG, 'image/png').expect(401);
  });

  it('answers an oversized upload with a JSON error', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    const response = await upload(
      agent,
      Buffer.concat([JPEG, randomBytes(50 * 1024)]),
      'image/jpeg',
    );

    expect(response.status).toBe(413);
    expect(response.body.error).toMatch(/100 KB/);
  });

  it('accepts WebP', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await upload(agent, WEBP, 'image/webp').expect(200);
  });

  it('serves even a JPEG polyglot only as an inert, downloadable image', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await upload(agent, HTML_AS_JPEG, 'image/jpeg').expect(200);

    const served = await agent.get(`/users/${await idOf('kellie.jubela@smu.edu.sg')}/avatar`);

    expect(served.headers['content-type']).toBe('image/jpeg');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(served.headers['content-disposition']).toBe('inline; filename="avatar.jpg"');
  });
});

describe('avatar bytes stay private to the avatar route', () => {
  it('never appear in profile, team or match responses', async () => {
    const leader = await loginAs(app, { userName: 'leader@smu.edu.sg' });
    const member = await loginAs(app, { userName: 'member@smu.edu.sg' });
    await member
      .patch('/me')
      .send({ skills: ['Vue.js'] })
      .expect(200);
    await upload(leader, PNG, 'image/png').expect(200);
    await upload(member, PNG, 'image/png').expect(200);
    const team = (await leader.post('/teams').send(TEAM).expect(201)).body;

    const bodies = [
      (await leader.get('/me')).body,
      (await member.get('/teams')).body,
      (await leader.get('/teams/mine')).body,
      (await leader.get(`/teams/${team._id}/matches`)).body,
    ];

    const text = JSON.stringify(bodies);
    expect(text).toContain('updatedAt');
    expect(text).not.toContain('"data"');
    expect(text).not.toContain('contentType');
    expect(bodies[3][0].avatar.updatedAt).toBeDefined();
  });
});

describe('GET /users/:id/avatar', () => {
  it('needs a session', async () => {
    await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await request(app)
      .get(`/users/${await idOf('kellie.jubela@smu.edu.sg')}/avatar`)
      .expect(401);
  });

  it('answers 404 for an id that is not one', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    await agent.get('/users/not-an-id/avatar').expect(404);
  });
});

describe('DELETE /me/avatar', () => {
  it('removes the photo', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
    await upload(agent, PNG, 'image/png').expect(200);

    const response = await agent.delete('/me/avatar').expect(200);

    expect(response.body.user).not.toHaveProperty('avatar');
    await agent.get(`/users/${await idOf('kellie.jubela@smu.edu.sg')}/avatar`).expect(404);
  });
});
