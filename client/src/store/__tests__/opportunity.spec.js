import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useOpportunityStore } from '@/store/opportunity';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';

const mock = new MockAdapter(serverAPI);

const BOTH_SOURCES = {
  jobs: { count: 2, jobs: jobs(2) },
  hackathons: { count: 4, hackathons: HACKATHONS },
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe('useOpportunityStore', () => {
  it('fetchOpportunities loads both sources and the saved keys', async () => {
    mock.onGet('/opportunity/all').reply(200, BOTH_SOURCES);
    mock.onGet('/application').reply(200, [
      { _id: 'a1', opportunityId: jobs(1)[0] },
      { _id: 'a9', opportunityId: null },
    ]);
    const store = useOpportunityStore();

    await store.fetchOpportunities();

    expect(mock.history.get[0].params).toEqual({});
    expect(store.jobs).toEqual(jobs(2));
    expect(store.hackathons).toEqual(HACKATHONS);
    expect(store.savedItems).toEqual([{ key: 'adzuna-1', id: 'a1' }]);
    expect(store.isSaved(jobs(1)[0])).toBe(true);
    expect(store.isLoading).toBe(false);
    expect(store.status).toBe('');
    expect(store.lastUpdated).not.toBe('');
  });

  it('keeps the previous jobs and explains when one source is null', async () => {
    mock
      .onGet('/opportunity/all')
      .replyOnce(200, BOTH_SOURCES)
      .onGet('/opportunity/all')
      .replyOnce(200, { jobs: null, hackathons: { count: 1, hackathons: HACKATHONS.slice(0, 1) } });
    mock.onGet('/application').reply(200, []);
    const store = useOpportunityStore();

    await store.fetchOpportunities();
    await store.fetchOpportunities();

    expect(store.jobs).toEqual(jobs(2));
    expect(store.hackathons).toEqual(HACKATHONS.slice(0, 1));
    expect(store.status).toBe('Jobs could not be loaded right now.');
  });

  it('reports a failed load', async () => {
    mock.onGet('/opportunity/all').reply(500);
    const store = useOpportunityStore();

    await store.fetchOpportunities();

    expect(store.status).toBe('There was an error: Request failed with status code 500');
    expect(store.isLoading).toBe(false);
  });

  it('reloadJobs sends the filters and resets paging', async () => {
    mock
      .onGet('/opportunity/jobs')
      .replyOnce(200, { count: 1, jobs: jobs(1) })
      .onGet('/opportunity/jobs')
      .replyOnce(200, { count: 1, jobs: jobs(1) })
      .onGet('/opportunity/jobs')
      .replyOnce(200, { count: 0, jobs: [] })
      .onGet('/opportunity/jobs')
      .replyOnce(200, { count: 0, jobs: [] });
    const store = useOpportunityStore();
    store.jobType = 'intern';

    await store.reloadJobs();
    expect(store.jobs).toEqual(jobs(1));
    expect(store.hasMoreJobs).toBe(true);

    await store.fetchMoreJobs();
    await store.reloadJobs();
    expect(store.jobs).toEqual([]);
    expect(store.hasMoreJobs).toBe(false);

    await store.fetchMoreJobs();
    expect(mock.history.get.map((config) => config.params)).toEqual([
      { page: 1, type: 'intern' },
      { page: 2, type: 'intern' },
      { page: 1, type: 'intern' },
      { page: 2, type: 'intern' },
    ]);
  });

  it('fetchMoreJobs appends new jobs only and stops when nothing new arrives', async () => {
    const [first, second, third] = jobs(3);
    mock
      .onGet('/opportunity/jobs', { params: { page: 2 } })
      .reply(200, { jobs: [second, third] });
    mock
      .onGet('/opportunity/jobs', { params: { page: 3 } })
      .reply(200, { jobs: [first] });
    const store = useOpportunityStore();
    store.jobs = [first, second];

    await store.fetchMoreJobs();
    expect(store.jobs).toEqual([first, second, third]);
    expect(store.hasMoreJobs).toBe(true);

    await store.fetchMoreJobs();
    expect(store.jobs).toHaveLength(3);
    expect(store.hasMoreJobs).toBe(false);
  });

  it('fetchMoreJobs stops after a failed page', async () => {
    mock.onGet('/opportunity/jobs').reply(500);
    const store = useOpportunityStore();
    store.jobs = jobs(2);

    await store.fetchMoreJobs();

    expect(store.jobs).toEqual(jobs(2));
    expect(store.hasMoreJobs).toBe(false);
  });

  it('toggleSave posts, then deletes, the application', async () => {
    const [item] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9', opportunityId: 'o9', status: 'saved' });
    mock.onDelete('/application/a9').reply(204);
    const store = useOpportunityStore();

    await store.toggleSave(item);

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      opportunity: item,
      status: 'saved',
      notes: 'Saved via techtrek.',
    });
    expect(store.isSaved(item)).toBe(true);

    await store.toggleSave(item);

    expect(mock.history.delete[0].url).toBe('/application/a9');
    expect(store.isSaved(item)).toBe(false);
  });

  it('toggleSave reports a failure by title', async () => {
    const [item] = jobs(1);
    mock.onPost('/application').reply(500);
    const store = useOpportunityStore();

    await store.toggleSave(item);

    expect(store.status).toBe(
      'Could not update "Frontend Intern": Request failed with status code 500',
    );
    expect(store.isSaved(item)).toBe(false);
    expect(store.isSaving).toBe(false);
  });

  it('toggleSave ignores a second click while saving', async () => {
    const [item] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9' });
    const store = useOpportunityStore();

    await Promise.all([store.toggleSave(item), store.toggleSave(item)]);

    expect(mock.history.post).toHaveLength(1);
    expect(store.isSaved(item)).toBe(true);
  });
});
