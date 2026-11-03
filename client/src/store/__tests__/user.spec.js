import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';

const mock = new MockAdapter(serverAPI);

const USER = {
  _id: 'u1',
  userName: 'kellie.jubela@smu.edu.sg',
  displayName: 'Kellie Jubela',
  skills: ['vue'],
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe('useUserStore', () => {
  it('updateMe patches /me and keeps the returned profile', async () => {
    const user = {
      _id: 'u1',
      userName: 'kellie.jubela@smu.edu.sg',
      skills: ['vue'],
      linkedinUrl: 'https://www.linkedin.com/in/kellie',
      githubUrl: 'https://github.com/kellie',
    };
    mock.onPatch('/me', { skills: ['vue'] }).reply(200, { user });
    const store = useUserStore();

    await store.updateMe({ skills: ['vue'] });

    expect(store.skills).toEqual(['vue']);
    expect(store.username).toBe('kellie.jubela@smu.edu.sg');
    expect(store._id).toBe('u1');
    expect(store.isLoggedIn).toBe(true);
  });

  it('fetchMe treats a failed check as logged out and marks the session checked', async () => {
    mock.onGet('/me').reply(503);
    const store = useUserStore();
    store.user = { ...USER };

    await store.fetchMe();

    expect(store.isLoggedIn).toBe(false);
    expect(store.hasCheckedSession).toBe(true);
  });

  it('fetchMe keeps a logged-in user', async () => {
    mock.onGet('/me').reply(200, { isAuthenticated: true, user: USER });
    const store = useUserStore();

    await store.fetchMe();

    expect(store.user).toEqual(USER);
    expect(store.displayName).toBe('Kellie Jubela');
    expect(store.hasCheckedSession).toBe(true);
  });

  it('logout clears the session even when the server fails', async () => {
    mock.onPost('/logout').reply(500);
    const store = useUserStore();
    store.user = { ...USER };

    await store.logout();

    expect(store.isLoggedIn).toBe(false);
    expect(store.hasCheckedSession).toBe(true);
  });

  it('deleteMe sends the password and clears the session', async () => {
    mock.onDelete('/me').reply(204);
    const store = useUserStore();
    store.user = { ...USER };

    await store.deleteMe('Password1!');

    expect(JSON.parse(mock.history.delete[0].data)).toEqual({ password: 'Password1!' });
    expect(store.isLoggedIn).toBe(false);
  });

  it('login lets the error through and leaves the user untouched', async () => {
    mock.onPost('/login').reply(401, { error: 'Wrong password.' });
    const store = useUserStore();
    store.user = { ...USER };

    await expect(store.login(USER.userName, 'nope')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(store.user).toEqual(USER);
  });
});
