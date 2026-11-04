import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');

const SENIOR = 'senior.one@smu.edu.sg';
const OTHER_SENIOR = 'senior.two@smu.edu.sg';
const JUNIOR = 'junior.one@smu.edu.sg';

const REVIEW = {
  difficulty: 4,
  rounds: 'Online assessment, technical interview, hiring manager chat',
  tips: 'Revise graphs and talk through your thinking out loud.',
};

function role(organisation, title = 'Software Engineer Intern') {
  return manualOpportunity({ type: 'internship', organisation, title });
}

async function shareTips(agent, opportunity, review = REVIEW) {
  const application = await saveApplication(agent, { opportunity, status: 'offer' });
  await agent.post(`/application/${application._id}/review`).send(review).expect(201);
}

async function seniorTipsFor(agent) {
  const { body } = await agent.get('/interview/dashboard').expect(200);
  return body.seniorTips;
}

describe('GET /interview/dashboard senior tips', () => {
  it('shows tips for the same organisation and title in any letter case, without the author', async () => {
    const senior = await loginAs(app, { userName: SENIOR });
    await shareTips(senior, role('Grab', 'software engineer intern'));
    const junior = await loginAs(app, { userName: JUNIOR });
    await saveApplication(junior, { opportunity: role('grab'), status: 'applied' });

    expect(await seniorTipsFor(junior)).toEqual([
      {
        organisation: 'Grab',
        title: 'software engineer intern',
        difficulty: REVIEW.difficulty,
        rounds: REVIEW.rounds,
        tips: REVIEW.tips,
        createdAt: expect.any(String),
      },
    ]);
  });

  it('leaves out other titles, roles that are only saved and your own tips', async () => {
    const senior = await loginAs(app, { userName: SENIOR });
    await shareTips(senior, role('Grab'));
    await saveApplication(senior, { opportunity: role('Grab'), status: 'interview' });
    const junior = await loginAs(app, { userName: JUNIOR });
    await saveApplication(junior, {
      opportunity: role('Grab', 'Data Analyst Intern'),
      status: 'interview',
    });
    await saveApplication(junior, { opportunity: role('Grab'), status: 'saved' });

    expect(await seniorTipsFor(junior)).toEqual([]);
    expect(await seniorTipsFor(senior)).toEqual([]);
  });

  it('matches every company the student applied to for a title that has one card', async () => {
    const senior = await loginAs(app, { userName: SENIOR });
    await shareTips(senior, role('Grab'));
    const otherSenior = await loginAs(app, { userName: OTHER_SENIOR });
    await shareTips(otherSenior, role('DBS'), { difficulty: 2, tips: 'Know your CV well.' });
    const junior = await loginAs(app, { userName: JUNIOR });
    await saveApplication(junior, { opportunity: role('Grab'), status: 'applied' });
    await saveApplication(junior, { opportunity: role('DBS'), status: 'applied' });

    const { body } = await junior.get('/interview/dashboard').expect(200);

    expect(body.applicationCards).toHaveLength(1);
    expect(body.seniorTips.map((tip) => [tip.organisation, tip.tips]).sort()).toEqual([
      ['DBS', 'Know your CV well.'],
      ['Grab', REVIEW.tips],
    ]);
  });
});
