import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Application = require('../models/Application');

describe('follow-up tracking on applications', () => {
  it('notes when an application is created as Applied', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const applied = await saveApplication(agent, { status: 'applied' });

    expect(applied.appliedAt).toBeTruthy();
  });

  it('starts the clock when a card moves to Applied, and not again while it stays there', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const saved = await saveApplication(agent);
    expect(saved.appliedAt).toBeUndefined();

    const moved = (
      await agent.patch(`/application/${saved._id}`).send({ status: 'applied' }).expect(200)
    ).body;
    expect(moved.appliedAt).toBeTruthy();

    // editing notes later doesn't restart it
    await Application.updateOne(
      { _id: saved._id },
      { appliedAt: new Date('2026-10-01T00:00:00Z') },
    );
    const edited = (
      await agent
        .patch(`/application/${saved._id}`)
        .send({ notes: 'Emailed HR', status: 'applied' })
        .expect(200)
    ).body;
    expect(edited.appliedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('saves "Followed up" and lets it be undone', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const applied = await saveApplication(agent, { status: 'applied' });

    const followed = (
      await agent
        .patch(`/application/${applied._id}`)
        .send({ followedUpAt: '2026-11-05T03:00:00Z' })
        .expect(200)
    ).body;
    expect(followed.followedUpAt).toBe('2026-11-05T03:00:00.000Z');

    const undone = (
      await agent.patch(`/application/${applied._id}`).send({ followedUpAt: null }).expect(200)
    ).body;
    expect(undone.followedUpAt).toBeNull();
  });

  it('rejects a follow-up date that is not a date', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const applied = await saveApplication(agent, { status: 'applied' });

    await agent.patch(`/application/${applied._id}`).send({ followedUpAt: 'soon' }).expect(400);
  });
});
