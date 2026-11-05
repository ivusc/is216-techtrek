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

    expect(store.status).toBe('Opportunities could not be loaded right now. Try again in a moment.');
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

  it('asks for a deadline after tracking a job without one, but not a hackathon', async () => {
    const [job] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9', status: 'saved' });
    const store = useOpportunityStore();

    await store.toggleSave(job);
    expect(store.deadlinePrompt).toEqual({ applicationId: 'a9', item: job });

    store.skipDeadline();
    await store.toggleSave(HACKATHONS[0]);
    expect(store.deadlinePrompt).toBeNull();
  });

  it('saves the deadline on the tracked application and closes the question', async () => {
    const [job] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9', status: 'saved' });
    mock.onPatch('/application/a9').reply((config) => [200, { _id: 'a9', ...JSON.parse(config.data) }]);
    const store = useOpportunityStore();
    await store.toggleSave(job);

    const updated = await store.saveDeadline('2026-11-20T15:59:59.000Z');

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ deadline: '2026-11-20T15:59:59.000Z' });
    expect(updated.deadline).toBe('2026-11-20T15:59:59.000Z');
    expect(store.deadlinePrompt).toBeNull();
  });

  it('drops the question if the job is untracked before it is answered', async () => {
    const [job] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9', status: 'saved' });
    mock.onDelete('/application/a9').reply(204);
    const store = useOpportunityStore();

    await store.toggleSave(job);
    await store.toggleSave(job);

    expect(store.deadlinePrompt).toBeNull();
  });

  it('does not ask for a deadline when the job already has one', async () => {
    const job = { ...jobs(1)[0], deadline: '2026-12-01T00:00:00.000Z' };
    mock.onPost('/application').reply(201, { _id: 'a9', status: 'saved' });
    const store = useOpportunityStore();

    await store.toggleSave(job);

    expect(store.isSaved(job)).toBe(true);
    expect(store.deadlinePrompt).toBeNull();
  });

  it('keeps the question open and explains when saving the deadline fails', async () => {
    const [job] = jobs(1);
    mock.onPost('/application').reply(201, { _id: 'a9', status: 'saved' });
    mock.onPatch('/application/a9').reply(500);
    const store = useOpportunityStore();
    await store.toggleSave(job);

    const updated = await store.saveDeadline('2026-11-20T15:59:59.000Z');

    expect(updated).toBeNull();
    expect(store.deadlinePrompt).toEqual({ applicationId: 'a9', item: job });
    expect(store.status).toBe('Could not save the deadline: Request failed with status code 500');
  });

  it('saveDeadline does nothing when no question is open', async () => {
    const store = useOpportunityStore();

    expect(await store.saveDeadline('2026-11-20T15:59:59.000Z')).toBeNull();
    expect(mock.history.patch).toHaveLength(0);
  });

  it('counts teams with open slots per hackathon by event name', async () => {
    mock.onGet('/teams').reply(200, [
      { event: { name: 'Hack&Roll' }, slotsOpen: 2 },
      { event: { name: 'Hack&Roll' }, slotsOpen: 1 },
      { event: { name: 'Hack&Roll' }, slotsOpen: 0 },
      { event: { name: 'NUS Fintech' }, slotsOpen: 3 },
    ]);
    const store = useOpportunityStore();

    await store.fetchTeamCounts();

    expect(store.teamCounts).toEqual({ 'Hack&Roll': 2, 'NUS Fintech': 1 });
    expect(store.teamCountFor({ title: 'Hack&Roll' })).toBe(2);
    expect(store.teamCountFor({ title: 'No teams yet' })).toBe(0);
  });

  it('keeps the previous team counts when they fail to load', async () => {
    mock.onGet('/teams').replyOnce(200, [{ event: { name: 'Hack&Roll' }, slotsOpen: 1 }]);
    mock.onGet('/teams').replyOnce(500);
    const store = useOpportunityStore();

    await store.fetchTeamCounts();
    await store.fetchTeamCounts();

    expect(store.teamCounts).toEqual({ 'Hack&Roll': 1 });
  });

  it('loads the role options once', async () => {
    const roles = [{ key: 'frontend', label: 'Frontend' }];
    mock.onGet('/opportunity/job-filters').reply(200, { roles });
    const store = useOpportunityStore();

    await store.loadRoleOptions();
    await store.loadRoleOptions();

    expect(store.roleOptions).toEqual(roles);
    expect(mock.history.get).toHaveLength(1);
  });

  it('sends the job filters with the first load', async () => {
    mock.onGet('/opportunity/all').reply(200, BOTH_SOURCES);
    mock.onGet('/application').reply(200, []);
    const store = useOpportunityStore();
    store.jobType = 'fulltime';
    store.jobField = 'data';

    await store.fetchOpportunities();

    expect(mock.history.get[0].params).toEqual({ type: 'fulltime', field: 'data' });
  });
});

