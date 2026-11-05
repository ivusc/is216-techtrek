import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { loginAs } from './helpers/session.js';
import { manualOpportunity, saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');

const REVIEW = {
  difficulty: 4,
  rounds: 'OA, technical, HM chat',
  tips: 'Revise graphs and think out loud.',
};

function role(organisation, title = 'Software Engineer Intern') {
  return manualOpportunity({ type: 'internship', organisation, title });
}

async function shareTips(agent, opportunity, review = REVIEW) {
  const application = await saveApplication(agent, { opportunity, status: 'offer' });
  await agent.post(`/application/${application._id}/review`).send(review).expect(201);
}

async function tipsFor(agent, organisation, title = '') {
  const { body } = await agent.get('/interview/tips').query({ organisation, title }).expect(200);
  return body.tips;
}

describe('GET /interview/tips', () => {
  it("shows other students' tips for that company, same role first, without the author", async () => {
    const seniorA = await loginAs(app, { userName: 'senior.a@smu.edu.sg' });
    const seniorB = await loginAs(app, { userName: 'senior.b@smu.edu.sg' });
    await shareTips(seniorA, role('Grab', 'Data Analyst Intern'), {
      ...REVIEW,
      tips: 'Know your SQL joins.',
    });
    await shareTips(seniorB, role('grab', 'software engineer intern'));
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });

    const tips = await tipsFor(me, 'Grab', 'Software Engineer Intern');

    expect(tips.map((tip) => [tip.title, tip.sameRole])).toEqual([
      ['software engineer intern', true],
      ['Data Analyst Intern', false],
    ]);
    expect(tips[0]).toMatchObject({
      difficulty: 4,
      rounds: 'OA, technical, HM chat',
      tips: 'Revise graphs and think out loud.',
    });
    expect(Object.keys(tips[0])).not.toContain('userId');
  });

  it('leaves out other companies, my own tips, and matches the company name literally', async () => {
    const senior = await loginAs(app, { userName: 'senior.a@smu.edu.sg' });
    await shareTips(senior, role('Shopee'));
    await shareTips(senior, role('C++ Labs'));
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await shareTips(me, role('Grab'));

    expect(await tipsFor(me, 'Grab')).toEqual([]);
    expect(await tipsFor(me, 'C++ Labs')).toHaveLength(1);
    expect(await tipsFor(me, 'C+')).toEqual([]);
  });

  it('needs an organisation and a login', async () => {
    const me = await loginAs(app, { userName: 'me@smu.edu.sg' });
    await me.get('/interview/tips').expect(400);
    await request(app).get('/interview/tips').query({ organisation: 'Grab' }).expect(401);
  });
});
