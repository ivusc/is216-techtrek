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

  it('updateApplicationStatus does nothing when the stage is unchanged', async () => {
    const store = seededStore();
    store.status = 'There was an error: Network Error';

    await store.updateApplicationStatus('a2', 'applied');

    expect(mock.history.patch).toHaveLength(0);
    expect(store.status).toBe('There was an error: Network Error');
  });
});
