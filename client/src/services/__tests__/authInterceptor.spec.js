import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { installAuthInterceptor } from '@/services/authInterceptor';
import * as userService from '@/services/userService';
import { useUserStore } from '@/store/user';

const mock = new MockAdapter(serverAPI);
let interceptorId;
let router;

function routerAt(fullPath) {
  return {
    currentRoute: ref({ path: fullPath.split('?')[0], fullPath }),
    push: vi.fn(),
  };
}

function loggedInStore() {
  const store = useUserStore();
  store.user = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg', skills: [] };
  return store;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  serverAPI.interceptors.response.eject(interceptorId);
  mock.reset();
});

function install(fullPath) {
  router = routerAt(fullPath);
  interceptorId = installAuthInterceptor(serverAPI, router);
}

describe('installAuthInterceptor', () => {
  it('clears the session and sends the user to log in on a 401', async () => {
    install('/tracker');
    const store = loggedInStore();
    mock.onGet('/application').reply(401, { error: 'Please log in first.' });

    await expect(serverAPI.get('/application')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(store.isLoggedIn).toBe(false);
    expect(router.push).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/tracker' } });
  });

  it('leaves a wrong password on login to the form', async () => {
    install('/home');
    const store = loggedInStore();
    mock.onPost('/login').reply(401, { error: 'Wrong password.' });

    await expect(userService.login('kellie.jubela@smu.edu.sg', 'nope')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(router.push).not.toHaveBeenCalled();
    expect(store.isLoggedIn).toBe(true);
  });

  it('does not navigate again when already on the login page', async () => {
    install('/login?redirect=/teams');
    mock.onGet('/teams').reply(401);

    await expect(serverAPI.get('/teams')).rejects.toBeDefined();

    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps the session on a 403', async () => {
    install('/profile');
    const store = loggedInStore();
    mock.onPatch('/me/password').reply(403, { error: 'Wrong password.' });

    await expect(serverAPI.patch('/me/password', {})).rejects.toBeDefined();

    expect(store.isLoggedIn).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
  });
});
