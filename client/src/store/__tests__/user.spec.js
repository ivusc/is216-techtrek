import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';

const mock = new MockAdapter(serverAPI);

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => mock.reset());

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
});
