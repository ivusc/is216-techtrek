import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import LoginPanel from '@/components/login/LoginPanel.vue';

const routing = vi.hoisted(() => ({ push: vi.fn(), query: {} }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routing.push }),
  useRoute: () => ({ query: routing.query }),
}));

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  routing.push.mockReset();
  mock.onPost('/login').reply(200, { user: { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg' } });
});

afterEach(() => mock.reset());

async function logInWith(redirect) {
  routing.query = redirect === undefined ? {} : { redirect };
  const wrapper = mount(LoginPanel);
  await wrapper.find('input[type="email"]').setValue('kellie.jubela@smu.edu.sg');
  await wrapper.find('input[type="password"]').setValue('Password1!');
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('LoginPanel', () => {
  it('follows only same-origin paths after logging in', async () => {
    const cases = [
      ['/tracker', '/tracker'],
      ['//evil.com', '/home'],
      ['https://evil.com', '/home'],
      ['/\\evil.com', '/home'],
      [['/tracker'], '/home'],
      [undefined, '/home'],
    ];

    for (const [redirect, destination] of cases) {
      routing.push.mockReset();
      await logInWith(redirect);
      expect(routing.push, `redirect ${JSON.stringify(redirect)}`).toHaveBeenCalledWith(
        destination,
      );
    }
  });
});
