import { afterEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import {
  fetchAllOpportunities,
  fetchJobFilterOptions,
  fetchJobs,
} from '@/services/opportunityService';

const mock = new MockAdapter(serverAPI);

afterEach(() => mock.reset());

describe('opportunityService', () => {
  it.each([
    [
      'fetchAllOpportunities leaves out empty filters',
      () => fetchAllOpportunities({ type: '', field: 'frontend' }),
      '/opportunity/all',
      { field: 'frontend' },
    ],
    [
      'fetchAllOpportunities sends no filters when given none',
      () => fetchAllOpportunities(),
      '/opportunity/all',
      {},
    ],
    [
      'fetchAllOpportunities sends the sector with its role',
      () => fetchAllOpportunities({ sector: 'finance', type: '', field: 'audit' }),
      '/opportunity/all',
      { sector: 'finance', field: 'audit' },
    ],
    [
      'fetchJobFilterOptions asks for the sectors and roles',
      () => fetchJobFilterOptions(),
      '/opportunity/job-filters',
      undefined,
    ],
    [
      'fetchJobs sends the page with the filters',
      () => fetchJobs(3, { type: 'intern' }),
      '/opportunity/jobs',
      { page: 3, type: 'intern' },
    ],
  ])('%s', async (label, call, url, params) => {
    mock.onGet().reply(200, { jobs: [] });

    await expect(call()).resolves.toEqual({ jobs: [] });

    expect(mock.history.get[0].url).toBe(url);
    expect(mock.history.get[0].params).toEqual(params);
  });
});
