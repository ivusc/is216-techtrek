import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const { PRESETS } = require('../service/avatar-presets');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function idOf(userName) {
  return String((await User.findOne({ userName }))._id);
}

describe('illustrated characters', () => {
  it('lists 4 female and 4 male characters, each with a picture', async () => {
    const { body } = await request(app).get('/avatars').expect(200);

    expect(body.presets.filter((preset) => preset.group === 'female')).toHaveLength(4);
    expect(body.presets.filter((preset) => preset.group === 'male')).toHaveLength(4);
    for (const preset of body.presets) {
      const picture = await request(app).get(`/avatars/${preset.key}`).expect(200);
      expect(picture.headers['content-type']).toContain('image/svg+xml');
      expect(picture.body.toString()).toMatch(/^<svg /);
    }
    await request(app).get('/avatars/nope').expect(404);
  });

  it('makes a picked character my profile picture, shown at my usual avatar address', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });

    const { body } = await agent.put('/me/avatar/preset').send({ preset: 'f2' }).expect(200);
    expect(body.user.avatar).toMatchObject({ preset: 'f2' });
    expect(body.user.avatar.updatedAt).toBeTruthy();

    const picture = await agent.get(`/users/${await idOf('me@smu.edu.sg')}/avatar`).expect(200);
    expect(picture.headers['content-type']).toContain('image/svg+xml');
    expect(picture.body.toString()).toBe(PRESETS.f2.svg);
  });

  it('swaps between an uploaded photo and a character, and removes either', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const avatarUrl = `/users/${await idOf('me@smu.edu.sg')}/avatar`;

    await agent.put('/me/avatar/preset').send({ preset: 'm3' }).expect(200);
    const photo = (
      await agent.put('/me/avatar').set('Content-Type', 'image/png').send(PNG).expect(200)
    ).body;
    expect(photo.user.avatar.preset).toBeUndefined();
    expect((await agent.get(avatarUrl).expect(200)).headers['content-type']).toContain('image/png');

    await agent.put('/me/avatar/preset').send({ preset: 'm1' }).expect(200);
    expect((await agent.get(avatarUrl).expect(200)).headers['content-type']).toContain(
      'image/svg+xml',
    );

    await agent.delete('/me/avatar').expect(200);
    await agent.get(avatarUrl).expect(404);
  });

  it('only accepts a real character, and needs a login', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await agent.put('/me/avatar/preset').send({ preset: 'x9' }).expect(400);
    await agent.put('/me/avatar/preset').send({}).expect(400);
    await request(app).put('/me/avatar/preset').send({ preset: 'f1' }).expect(401);
  });
});
