import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginAs } from './helpers/session.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const opportunityService = require('../service/opportunity-service');
const opportunityAlerts = require('../service/opportunity-alerts');

const job = (id, title, description = '') => ({
  source: 'adzuna',
  externalId: id,
  type: 'job',
  title,
  description,
});
const hackathon = (id, title, themes = []) => ({
  source: 'devpost',
  externalId: id,
  type: 'hackathon',
  title,
  themes,
});

let jobs;
let hackathons;

beforeEach(() => {
  opportunityAlerts.clearCache();
  jobs = [
    job('j1', 'Frontend Developer', 'Build our Vue.js dashboard'),
    job('j2', 'Accountant', 'Spreadsheets'),
  ];
  hackathons = [
    hackathon('h1', 'AI for Good', ['Machine Learning']),
    hackathon('h2', 'Design Jam', ['UI/UX']),
  ];
  vi.spyOn(opportunityService, 'getJobs').mockImplementation(async () => ({
    count: jobs.length,
    jobs,
  }));
  vi.spyOn(opportunityService, 'getHackathons').mockImplementation(async () => ({
    count: hackathons.length,
    hackathons,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function student(skills = ['vue', 'Machine Learning']) {
  const agent = await loginAs(app, { userName: 'me@smu.edu.sg' });
  await User.updateOne({ userName: 'me@smu.edu.sg' }, { skills });
  return agent;
}

async function matchAlerts(agent) {
  const { body } = await agent.get('/notifications').expect(200);
  return body.notifications.filter((notification) => notification.type === 'new-matches');
}

describe('new opportunities that match my skills', () => {
  it('counts the new jobs and hackathons that mention my skills, and names the skills', async () => {
    const agent = await student();

    const [alert] = await matchAlerts(agent);

    expect(alert).toMatchObject({ jobCount: 1, hackathonCount: 1, read: false });
    expect(alert.skills).toEqual(['vue', 'Machine Learning']);
    expect(opportunityService.getJobs).toHaveBeenCalledWith({ page: 1, sortBy: 'date' });
  });

  it('checks again only after 6 hours, and only announces listings it has not announced before', async () => {
    const agent = await student();
    await matchAlerts(agent);

    // a new matching hackathon appears, but it's too soon to check
    hackathons.push(hackathon('h3', 'Vue Hack'));
    expect(await matchAlerts(agent)).toHaveLength(1);

    await User.updateOne(
      { userName: 'me@smu.edu.sg' },
      { matchAlertsCheckedAt: new Date(Date.now() - 7 * 3600000) },
    );
    const alerts = await matchAlerts(agent);
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({ jobCount: 0, hackathonCount: 1, skills: ['vue'] });
  });

  it('stays quiet with no skills or nothing new', async () => {
    const noSkills = await student([]);
    expect(await matchAlerts(noSkills)).toHaveLength(0);
    expect(opportunityService.getJobs).not.toHaveBeenCalled();

    await User.updateOne({ userName: 'me@smu.edu.sg' }, { skills: ['Cobol'] });
    expect(await matchAlerts(noSkills)).toHaveLength(0);
  });

  it('still checks hackathons when Adzuna is down, and never breaks the bell', async () => {
    opportunityService.getJobs.mockRejectedValue(new Error('Adzuna is down'));
    const agent = await student();

    const [alert] = await matchAlerts(agent);
    expect(alert).toMatchObject({ jobCount: 0, hackathonCount: 1 });

    opportunityService.getHackathons.mockRejectedValue(new Error('Devpost is down'));
    await User.updateOne({ userName: 'me@smu.edu.sg' }, { matchAlertsCheckedAt: new Date(0) });
    await agent.get('/notifications').expect(200);
  });

  it('keeps what it has seen off the profile', async () => {
    const agent = await student();
    await matchAlerts(agent);

    const { body } = await agent.get('/me').expect(200);
    expect(JSON.stringify(body)).not.toContain('matchAlertsSeen');
  });
});
