import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Application = require('../models/Application');

const DAY = 24 * 60 * 60 * 1000;

function patch(agent, id, body) {
  return agent.patch(`/application/${id}`).send(body).expect(200);
}

async function list(agent) {
  return (await agent.get('/application').expect(200)).body;
}

// pretend the card's last step happened this many days ago
async function lastStepDaysAgo(id, days) {
  const application = await Application.findById(id);
  const steps = application.statusHistory.map((step) => step.toObject());
  steps[steps.length - 1].at = new Date(Date.now() - days * DAY);
  await Application.updateOne({ _id: id }, { statusHistory: steps }, { timestamps: false });
}

describe('application history', () => {
  it('remembers each step with its date', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const created = await saveApplication(agent);

    await patch(agent, created._id, { status: 'applied' });
    await patch(agent, created._id, { notes: 'Emailed HR' }); // not a new step
    const offer = (await patch(agent, created._id, { status: 'offer' })).body;

    expect(offer.statusHistory.map((step) => step.status)).toEqual(['saved', 'applied', 'offer']);
    expect(offer.statusHistory.every((step) => step.at)).toBe(true);
  });

  it('moves a finished card to History 14 days after its last step', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const rejected = await saveApplication(agent, { status: 'rejected' });
    const recent = await saveApplication(agent, {
      status: 'rejected',
      opportunity: manualOpportunity({ title: 'Recent' }),
    });
    const active = await saveApplication(agent, {
      status: 'applied',
      opportunity: manualOpportunity({ title: 'Active' }),
    });
    await lastStepDaysAgo(rejected._id, 15);
    await lastStepDaysAgo(recent._id, 3);
    await lastStepDaysAgo(active._id, 40);

    const byId = Object.fromEntries((await list(agent)).map((item) => [item._id, item]));

    expect(byId[rejected._id].archivedAt).toBeTruthy();
    expect(byId[recent._id].archivedAt).toBeUndefined();
    expect(byId[active._id].archivedAt).toBeUndefined();
  });

  it('moves a card to History by hand, back to the board, and back when it moves to an unfinished step', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const created = await saveApplication(agent, { status: 'applied' });

    const archived = (await patch(agent, created._id, { archivedAt: new Date().toISOString() }))
      .body;
    expect(archived.archivedAt).toBeTruthy();
    const restored = (await patch(agent, created._id, { archivedAt: null })).body;
    expect(restored.archivedAt).toBeNull();

    await patch(agent, created._id, { status: 'rejected', archivedAt: new Date().toISOString() });
    const reopened = (await patch(agent, created._id, { status: 'interview' })).body;
    expect(reopened.archivedAt).toBeNull();
  });

  it('starts the history of an older card from its next step', async () => {
    const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
    const created = await saveApplication(agent, { status: 'applied' });
    await Application.updateOne({ _id: created._id }, { $unset: { statusHistory: 1 } });

    const moved = (await patch(agent, created._id, { status: 'interview' })).body;
    expect(moved.statusHistory.map((step) => step.status)).toEqual(['interview']);
  });
});
