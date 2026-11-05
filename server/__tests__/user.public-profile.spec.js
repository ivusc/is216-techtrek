import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');

describe("someone's profile page", () => {
  it('shows their profile and email, but never their Telegram or password', async () => {
    const owner = await loginAs(app, { userName: 'ravi.k@smu.edu.sg' });
    await owner
      .patch('/me')
      .send({ about: 'I like design systems.', telegram: 'ravi_k', skills: ['Figma'], course: 'IS' })
      .expect(200);
    const id = String((await User.findOne({ userName: 'ravi.k@smu.edu.sg' }))._id);

    const viewer = await loginAs(app, { userName: 'kellie.j@smu.edu.sg' });
    const response = await viewer.get('/users/' + id).expect(200);

    expect(response.body.user).toMatchObject({
      userName: 'ravi.k@smu.edu.sg',
      about: 'I like design systems.',
      skills: ['Figma'],
      course: 'IS',
    });
    expect(response.body.user.telegram).toBeUndefined();
    expect(response.body.user.password).toBeUndefined();
  });

  it('needs you to be logged in', async () => {
    await loginAs(app, { userName: 'ravi.k@smu.edu.sg' });
    const id = String((await User.findOne({ userName: 'ravi.k@smu.edu.sg' }))._id);
    await request(app).get('/users/' + id).expect(401);
  });

  it('says when there is no such person', async () => {
    const viewer = await loginAs(app, { userName: 'kellie.j@smu.edu.sg' });
    await viewer.get('/users/not-an-id').expect(404);
    await viewer.get('/users/507f1f77bcf86cd799439011').expect(404);
  });
});
