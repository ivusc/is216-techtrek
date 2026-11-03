import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useApplicationsStore } from '@/store/applications';
import { applications } from '@/__tests__/fixtures/applications';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function seededStore() {
  const store = useApplicationsStore();
  store.applications = applications();
  return store;
}

describe('useApplicationsStore', () => {
  it('fetchApplications fills the list', async () => {
    mock.onGet('/application').reply(200, applications());
    const store = useApplicationsStore();

    await store.fetchApplications();

    expect(store.applications).toEqual(applications());
    expect(store.status).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it.each([
    ['a server error', 500, undefined, 'There was an error: Request failed with status code 500'],
    ['an empty answer', 200, null, 'Applications could not be loaded right now.'],
  ])('fetchApplications reports %s', async (label, code, body, message) => {
    mock.onGet('/application').reply(code, body);
    const store = seededStore();

    await store.fetchApplications();

    expect(store.status).toBe(message);
    expect(store.applications).toHaveLength(4);
    expect(store.isLoading).toBe(false);
  });

  it('addApplication posts the details and keeps the created application without a second request', async () => {
    const opportunity = {
      source: 'manual',
      type: 'job',
      title: 'Product Intern',
      organisation: 'Carousell',
    };
    const details = { status: 'applied', deadline: '2026-11-10', notes: 'Referred by Sam.' };
    const created = {
      _id: 'a5',
      status: 'applied',
      deadline: '2026-11-10T00:00:00.000Z',
      notes: 'Referred by Sam.',
      opportunityId: { _id: 'o5', ...opportunity },
    };
    mock.onPost('/application').reply(201, created);
    const store = seededStore();

    await expect(store.addApplication(opportunity, details)).resolves.toBe(true);

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ opportunity, ...details });
    expect(mock.history.get).toHaveLength(0);
    expect(store.applications).toHaveLength(5);
    expect(store.applications.at(-1)).toEqual(created);
  });

  it("addApplication reports the server's reason", async () => {
    mock.onPost('/application').reply(409, { error: 'Application already exists' });
    const store = seededStore();

    await expect(store.addApplication({ title: 'Frontend Intern' }, {})).resolves.toBe(false);

    expect(store.status).toBe('Could not add the application: Application already exists');
    expect(store.applications).toHaveLength(4);
    expect(store.isSaving).toBe(false);
  });

  it('updateApplicationStatus does nothing when the stage is unchanged', async () => {
    const store = seededStore();
    store.status = 'There was an error: Network Error';

    await store.updateApplicationStatus('a2', 'registered');

    expect(mock.history.patch).toHaveLength(0);
    expect(store.status).toBe('There was an error: Network Error');
  });

  it('updateApplicationStatus patches and moves the card', async () => {
    mock.onPatch('/application/a1').reply(200, {});
    const store = seededStore();

    await store.updateApplicationStatus('a1', 'applied');

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'applied' });
    expect(store.applications.find((item) => item._id === 'a1').status).toBe('applied');
    expect(store.status).toBeNull();
    expect(store.isSaving).toBe(false);
  });

  it('updateApplicationStatus reports an unknown id', async () => {
    const store = seededStore();

    await store.updateApplicationStatus('missing', 'applied');

    expect(store.status).toBe('Unable to find application.');
    expect(mock.history.patch).toHaveLength(0);
  });

  it('updateApplication replaces the card with the server copy', async () => {
    const [, , interview] = applications();
    const saved = { ...interview, notes: 'Bring the portfolio.', contactName: 'Priya' };
    mock.onPatch('/application/a3').reply(200, saved);
    const store = seededStore();

    await store.updateApplication('a3', { notes: 'Bring the portfolio.', contactName: 'Priya' });

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      notes: 'Bring the portfolio.',
      contactName: 'Priya',
    });
    expect(store.applications[2]).toEqual(saved);
  });

  it('deleteApplication drops the card', async () => {
    mock.onDelete('/application/a4').reply(204);
    const store = seededStore();

    await store.deleteApplication('a4');

    expect(mock.history.delete[0].url).toBe('/application/a4');
    expect(store.applications.map((item) => item._id)).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('useApplicationsStore offer celebration', () => {
  const REVIEW = { difficulty: 4, rounds: 'Case study, then a panel', tips: 'Know the product.' };

  function shared(application) {
    return { ...application, review: { ...REVIEW, createdAt: '2026-11-03T02:00:00.000Z' } };
  }

  it('celebrates a job that is moved into Offer', async () => {
    mock.onPatch('/application/a3').reply(200, {});
    const store = seededStore();

    await store.updateApplicationStatus('a3', 'offer');

    expect(store.celebration.step).toBe('congrats');
    expect(store.celebration.application._id).toBe('a3');
    expect(store.celebration.application.status).toBe('offer');
  });

  it('does not celebrate any other move', async () => {
    mock.onPatch('/application/a1').reply(200, {});
    const store = seededStore();

    await store.updateApplicationStatus('a1', 'applied');

    expect(store.celebration).toBeNull();
  });

  it('does not celebrate an offer whose tips were already shared', async () => {
    mock.onPatch(/\/application\/.+/).reply(200, {});
    const store = seededStore();
    store.applications.push(
      shared({ ...applications()[2], _id: 'a5', status: 'offer' }),
      shared({ ...applications()[2], _id: 'a6', status: 'interview' }),
    );

    await store.updateApplicationStatus('a5', 'offer');
    await store.updateApplicationStatus('a6', 'offer');

    expect(mock.history.patch.map((request) => request.url)).toEqual(['/application/a6']);
    expect(store.celebration).toBeNull();
  });

  it('celebrates when the detail form saves the move into Offer, but not a later edit', async () => {
    const [, , interview] = applications();
    mock
      .onPatch('/application/a3')
      .replyOnce(200, { ...interview, status: 'offer' })
      .onPatch('/application/a3')
      .reply(200, { ...interview, status: 'offer', notes: 'Signed.' });
    const store = seededStore();

    await store.updateApplication('a3', { status: 'offer' });

    expect(store.celebration).toEqual({
      application: { ...interview, status: 'offer' },
      step: 'congrats',
    });

    store.dismissCelebration();
    await store.updateApplication('a3', { status: 'offer', notes: 'Signed.' });

    expect(store.celebration).toBeNull();
  });

  it('celebrates an application added straight into Offer', async () => {
    const created = { ...applications()[2], _id: 'a5', status: 'offer' };
    mock.onPost('/application').reply(201, created);
    const store = seededStore();

    await expect(store.addApplication(created.opportunityId, { status: 'offer' })).resolves.toBe(
      true,
    );

    expect(store.applications).toHaveLength(5);
    expect(store.celebration).toEqual({ application: created, step: 'congrats' });
  });

  it('opens a new celebration at the congratulations step', async () => {
    mock.onPatch('/application/a3').reply(200, {});
    const store = seededStore();
    store.celebrate(store.applications[0], 'form');

    await store.updateApplicationStatus('a3', 'offer');

    expect(store.celebration.step).toBe('congrats');
    expect(store.celebration.application._id).toBe('a3');
  });

  it('submitReview posts the tips, keeps the reviewed copy and closes the celebration', async () => {
    const [, , interview] = applications();
    const reviewed = shared({ ...interview, status: 'offer' });
    mock.onPost('/application/a3/review').reply(201, reviewed);
    const store = seededStore();
    store.celebrate(store.applications[2], 'form');

    await store.submitReview('a3', REVIEW);

    expect(JSON.parse(mock.history.post[0].data)).toEqual(REVIEW);
    expect(store.applications[2]).toEqual(reviewed);
    expect(store.celebration).toBeNull();
    expect(store.isSaving).toBe(false);
  });

  it("submitReview keeps the form open with the server's reason", async () => {
    mock
      .onPost('/application/a3/review')
      .reply(409, { error: 'You already shared tips for this application.' });
    const store = seededStore();
    store.celebrate(store.applications[2], 'form');

    await store.submitReview('a3', REVIEW);

    expect(store.status).toBe(
      'Could not share your tips: You already shared tips for this application.',
    );
    expect(store.celebration.step).toBe('form');
    expect(store.applications[2].review).toBeUndefined();
    expect(store.isSaving).toBe(false);
  });
});
