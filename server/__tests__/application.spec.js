import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loginAs } from './helpers/session.js';
import { saveApplication } from './helpers/records.js';

const require = createRequire(import.meta.url);
const app = require('../app');

const ADZUNA_JOB = {
  source: 'adzuna',
  externalId: '5001',
  type: 'internship',
  title: 'Frontend Intern',
  organisation: 'Acme',
  location: 'Singapore',
  description: 'Build the dashboard in Vue.',
  url: 'https://www.adzuna.sg/details/5001',
  minSalary: 24000,
  maxSalary: 36000,
  salaryIsPredicted: false,
  contractTime: 'full_time',
  contractType: 'permanent',
  postedAt: '2026-10-30T00:00:00Z',
};

describe('POST /application', () => {
  it('returns the opportunity populated so the client needs no second request', async () => {
    const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });

    const response = await agent.post('/application').send({ opportunity: ADZUNA_JOB }).expect(201);

    expect(response.body.opportunityId.title).toBe('Frontend Intern');
  });
});

describe('PATCH /application/:id', () => {
  it.each([['a deadline that is not a date', { deadline: 'abc' }, 'deadline']])(
    'rejects %s',
    async (label, changes, message) => {
      const agent = await loginAs(app, { userName: 'kellie.jubela@smu.edu.sg' });
      const application = await saveApplication(agent);

      const response = await agent
        .patch(`/application/${application._id}`)
        .send(changes)
        .expect(400);

      expect(response.body.error).toContain(message);
    },
  );
});
