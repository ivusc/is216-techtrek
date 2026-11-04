import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import router from '@/router';
import { useUserStore } from '@/store/user';

const mock = new MockAdapter(serverAPI);

const USER = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg', displayName: 'Kellie Jubela' };

beforeEach(async () => {
  setActivePinia(createPinia());
  Object.assign(useUserStore(), { user: USER, hasCheckedSession: true });
  await router.push('/interview');
  setActivePinia(createPinia());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe('router guard', () => {
  it('lets a guest see the landing page at /', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: false, user: null });

    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/');
    expect(router.currentRoute.value.meta).toMatchObject({ bare: true, noScroll: true });
  });

  it('sends a guest to login with the way back', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: false, user: null });

    await router.push('/tracker');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/tracker');
  });

  it('keeps a logged-in user away from login', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: true, user: USER });

    await router.push('/login');

    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('sends a user who has not finished onboarding to the onboarding page', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: true, user: { ...USER, onboarded: false } });

    await router.push('/tracker');

    expect(router.currentRoute.value.path).toBe('/onboarding');
  });

  it('asks the server once per page load', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: true, user: USER });

    await router.push('/tracker');
    await router.push('/teams');

    expect(router.currentRoute.value.path).toBe('/teams');
    expect(mock.history.get).toHaveLength(1);
  });

  it('treats a failed session check as logged out', async () => {
    mock.onGet('/me').networkError();

    await router.push('/profile');

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile');
  });
});
