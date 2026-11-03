import { createRequire } from 'node:module';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import adzuna from './fixtures/adzuna.json';
import devpost from './fixtures/devpost.json';
import { failAdzuna, failDevpost, stubAdzuna, stubDevpost } from './helpers/upstream.js';

const require = createRequire(import.meta.url);
const app = require('../app');
const Opportunity = require('../models/Opportunity');
const { findOrCreateOpportunity } = require('../service/opportunity-service');

const BASE_PARAMS = { app_id: 'app', app_key: 'key', results_per_page: 20, category: 'it-jobs' };

describe('GET /opportunity/jobs', () => {
  it.each([
    ['intern', { title_only: 'intern' }],
    ['fulltime', { full_time: 1, what_exclude: 'intern internship' }],
  ])('maps type=%s and the field filter onto Adzuna params', async (type, typeParams) => {
    const get = stubAdzuna(adzuna);

    await request(app).get(`/opportunity/jobs?type=${type}&field=frontend&page=2`).expect(200);

    expect(get).toHaveBeenCalledWith('https://adzuna.test/jobs/sg/search/2', {
      params: { ...BASE_PARAMS, ...typeParams, what_or: 'frontend react vue angular' },
    });
  });

  it('sends no filter params when none are given', async () => {
    const get = stubAdzuna(adzuna);

    await request(app).get('/opportunity/jobs').expect(200);

    expect(get).toHaveBeenCalledWith('https://adzuna.test/jobs/sg/search/1', {
      params: BASE_PARAMS,
    });
  });

  it('normalises a job', async () => {
    stubAdzuna(adzuna);

    const response = await request(app).get('/opportunity/jobs').expect(200);

    expect(response.body.count).toBe(2);
    expect(response.body.jobs[0]).toMatchObject({
      source: 'adzuna',
      externalId: '5012345678',
      type: 'internship',
      title: 'Frontend Intern',
      organisation: 'Acme Pte Ltd',
      location: 'Singapore',
      description: 'Build Vue components for our booking flow.',
      url: 'https://www.adzuna.sg/land/ad/5012345678',
      minSalary: 18000,
      maxSalary: 24000,
      salaryIsPredicted: true,
      contractTime: 'full_time',
      contractType: 'permanent',
      postedAt: '2026-11-01T09:00:00Z',
    });
    expect(response.body.jobs[1]).toMatchObject({
      type: 'job',
      title: 'Software Engineer - Platform Team',
      salaryIsPredicted: false,
      contractType: null,
    });
  });

  it.each([
    ['type=parttime', 'type must be one of: fulltime, intern'],
    [
      'field=design',
      'field must be one of: frontend, fullstack, backend, data, ai, devops, cybersecurity, mobile',
    ],
  ])('rejects %s', async (query, error) => {
    const get = stubAdzuna(adzuna);

    const response = await request(app).get(`/opportunity/jobs?${query}`).expect(400);

    expect(response.body).toEqual({ error });
    expect(get).not.toHaveBeenCalled();
  });

  it('is public', async () => {
    stubAdzuna(adzuna);

    const response = await request(app).get('/opportunity/jobs').expect(200);

    expect(response.body.jobs).toHaveLength(2);
  });

  it('answers 500 when Adzuna fails', async () => {
    failAdzuna();

    const response = await request(app).get('/opportunity/jobs').expect(500);

    expect(response.body).toEqual({ error: 'Failed to fetch jobs.' });
  });
});

describe('GET /opportunity/hackathons', () => {
  it('normalises a hackathon', async () => {
    stubDevpost(devpost);

    const response = await request(app).get('/opportunity/hackathons').expect(200);

    expect(response.body.count).toBe(2);
    expect(response.body.hackathons[0]).toEqual({
      source: 'devpost',
      externalId: '31302',
      type: 'hackathon',
      title: 'Hack the Future',
      organisation: 'Devpost Labs',
      location: 'Online',
      dates: 'Oct 24 - Nov 30, 2026',
      deadline: '2026-11-30T23:59:59.000Z',
      prize: '$10,000 in prizes',
      themes: ['AI'],
      url: 'https://hackthefuture.devpost.com/',
      thumbnail: 'https://d112y698adiu2z.cloudfront.net/photos/hack-the-future.png',
      registrations: 1200,
      featured: true,
    });
    expect(response.body.hackathons[1].thumbnail).toBe(
      'https://images.devpost.test/build-week.png',
    );
  });

  it('reads a deadline whose end has no month', async () => {
    stubDevpost(devpost);

    const response = await request(app).get('/opportunity/hackathons').expect(200);

    expect(response.body.hackathons[1].dates).toBe('Nov 3 - 30, 2026');
    expect(response.body.hackathons[1].deadline).toBe('2026-11-30T23:59:59.000Z');
  });

  it('has no deadline without a date range', async () => {
    stubDevpost({
      hackathons: [{ ...devpost.hackathons[0], submission_period_dates: 'Nov 30, 2026' }],
    });

    const response = await request(app).get('/opportunity/hackathons').expect(200);

    expect(response.body.hackathons[0].deadline).toBeNull();
  });

  it('keeps a hackathon whose prize, themes, thumbnail or dates are missing', async () => {
    const { prizeText, themes, thumbnail_url, submission_period_dates, ...bare } =
      devpost.hackathons[0];
    stubDevpost({ hackathons: [bare] });

    const response = await request(app).get('/opportunity/hackathons').expect(200);

    expect(response.body.hackathons[0]).toMatchObject({
      prize: '',
      themes: [],
      thumbnail: null,
      deadline: null,
    });
    expect(response.body.hackathons[0].dates).toBeUndefined();
  });

  it('answers 500 when Devpost fails', async () => {
    failDevpost();

    const response = await request(app).get('/opportunity/hackathons').expect(500);

    expect(response.body).toEqual({ error: 'Failed to fetch hackathons.' });
  });
});

describe('GET /opportunity/all', () => {
  it('returns null for the source that failed', async () => {
    failAdzuna();
    stubDevpost(devpost);

    const response = await request(app).get('/opportunity/all').expect(200);

    expect(response.body.jobs).toBeNull();
    expect(response.body.hackathons.count).toBe(2);
    expect(response.body.hackathons.hackathons.map((hackathon) => hackathon.title)).toEqual([
      'Hack the Future',
      'Build Week',
    ]);
  });

  it('returns the jobs when only Devpost failed', async () => {
    stubAdzuna(adzuna);
    failDevpost();

    const response = await request(app).get('/opportunity/all').expect(200);

    expect(response.body.hackathons).toBeNull();
    expect(response.body.jobs.jobs).toHaveLength(2);
  });

  it('answers 502 when both fail', async () => {
    failAdzuna();
    failDevpost();

    const response = await request(app).get('/opportunity/all').expect(502);

    expect(response.body).toEqual({ error: 'Failed to fetch opportunities' });
  });

  it('validates filters before calling either source', async () => {
    stubAdzuna(adzuna);
    const get = stubDevpost(devpost);

    await request(app).get('/opportunity/all?type=x').expect(400);

    expect(get).not.toHaveBeenCalled();
  });
});

describe('findOrCreateOpportunity', () => {
  const JOB = {
    source: 'adzuna',
    externalId: '5012345678',
    type: 'job',
    title: 'Frontend Intern',
    organisation: 'Acme',
    url: 'https://www.adzuna.sg/land/ad/5012345678',
  };
  const MANUAL = { source: 'manual', type: 'job', title: 'Frontend Intern', organisation: 'Acme' };

  it('reuses the document with the same source and externalId', async () => {
    const first = await findOrCreateOpportunity(JOB);
    const second = await findOrCreateOpportunity({ ...JOB, title: 'Renamed' });

    expect(String(second._id)).toBe(String(first._id));
    expect(second.title).toBe('Frontend Intern');
    expect(await Opportunity.countDocuments()).toBe(1);
  });

  it('creates a new document each time without an externalId', async () => {
    const first = await findOrCreateOpportunity(MANUAL);
    const second = await findOrCreateOpportunity(MANUAL);

    expect(String(second._id)).not.toBe(String(first._id));
    expect(await Opportunity.countDocuments()).toBe(2);
  });

  it.each([
    [
      'a hackathon from Adzuna',
      { ...JOB, type: 'hackathon' },
      "type 'hackathon' is not allowed for source 'adzuna'",
    ],
    [
      'a maximum salary below the minimum',
      { ...JOB, minSalary: 5000, maxSalary: 3000 },
      'maxSalary must be >= minSalary',
    ],
    [
      'a user listing without a description',
      { ...MANUAL, source: 'user', type: 'hackathon', url: 'https://x.test', deadline: new Date() },
      'Path `description` is required',
    ],
    [
      'a Devpost listing without a url',
      { ...MANUAL, source: 'devpost', externalId: '31302', type: 'hackathon' },
      'Path `url` is required',
    ],
    [
      'a team size that is not a whole number',
      { ...MANUAL, maxTeamSize: 1.5 },
      'maxTeamSize must be a whole number',
    ],
  ])('rejects %s', async (label, payload, message) => {
    await expect(findOrCreateOpportunity(payload)).rejects.toThrow(message);

    expect(await Opportunity.countDocuments()).toBe(0);
  });
});
