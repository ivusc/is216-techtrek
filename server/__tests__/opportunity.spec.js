import { createRequire } from 'node:module';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import devpost from './fixtures/devpost.json';
import { stubDevpost } from './helpers/upstream.js';

const require = createRequire(import.meta.url);
const app = require('../app');

afterEach(() => vi.restoreAllMocks());

describe('GET /opportunity/hackathons', () => {
  it('keeps a hackathon whose prize, themes or thumbnail are missing', async () => {
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
});
