import { createRequire } from 'node:module';
import { vi } from 'vitest';

const require = createRequire(import.meta.url);
const axios = require('axios');

const replies = new Map();

function reply(url, respond) {
  if (!vi.isMockFunction(axios.get)) {
    replies.clear();
    vi.spyOn(axios, 'get').mockImplementation(async (requested) => {
      const prefix = [...replies.keys()].find((candidate) => requested.startsWith(candidate));
      if (!prefix) throw new Error(`No stub for ${requested}`);
      return replies.get(prefix)();
    });
  }
  replies.set(url, respond);
  return axios.get;
}

export function stubAdzuna({ results, count = results.length }) {
  return reply(process.env.JOB_API_URL, async () => ({ data: { count, results } }));
}

export function stubDevpost({ hackathons }) {
  return reply(process.env.HACKATHONS_API_URL, async () => ({ data: { hackathons } }));
}

export function failAdzuna() {
  return reply(process.env.JOB_API_URL, async () => {
    throw new Error('Adzuna is down');
  });
}

export function failDevpost() {
  return reply(process.env.HACKATHONS_API_URL, async () => {
    throw new Error('Devpost is down');
  });
}
