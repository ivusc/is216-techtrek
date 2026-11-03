import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import LoginPanel from '@/components/login/LoginPanel.vue';

const routing = vi.hoisted(() => ({ push: vi.fn(), query: {} }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routing.push }),
  useRoute: () => ({ query: routing.query }),
}));

const mock = new MockAdapter(serverAPI);

const EMAIL = 'kellie.jubela@smu.edu.sg';
const PASSWORD = 'Password1!';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  routing.push.mockReset();
  routing.query = {};
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onPost('/login').reply(200, { user: { _id: 'u1', userName: EMAIL } });
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function answerLogin(answer) {
  mock.resetHandlers();
  answer(mock.onPost('/login'));
}

async function submit(wrapper, { email = EMAIL, password = PASSWORD } = {}) {
  await wrapper.find('#login-email').setValue(email);
  await wrapper.find('#login-password').setValue(password);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

async function logInWith(redirect) {
  routing.query = redirect === undefined ? {} : { redirect };
  await submit(mount(LoginPanel));
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

  it('sends the email lower-cased', async () => {
    await submit(mount(LoginPanel), { email: 'Kellie.Jubela@smu.edu.sg' });

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userName: EMAIL, password: PASSWORD });
    expect(useUserStore().isLoggedIn).toBe(true);
  });
});

describe('LoginPanel failures', () => {
  it.each([
    [
      'a 404',
      (handler) => handler.reply(404, { error: 'User not found.' }),
      'This email has not been registered with us. Click on Sign up to create an account!',
    ],
    ['a 401', (handler) => handler.reply(401, { error: 'Wrong password.' }), 'Wrong password!'],
    [
      'a 400',
      (handler) => handler.reply(400, { error: 'UserName or Password was empty' }),
      'UserName or Password was empty',
    ],
    [
      'a 500',
      (handler) => handler.reply(500, { error: 'Something unexpected went wrong.' }),
      'Something unexpected went wrong. Please try again.',
    ],
    [
      'a network error',
      (handler) => handler.networkError(),
      'Could not reach the server. Is it running?',
    ],
  ])('explains %s', async (label, answer, message) => {
    answerLogin(answer);
    const wrapper = mount(LoginPanel);

    await submit(wrapper);

    expect(wrapper.find('[role="alert"]').text()).toBe(message);
    expect(routing.push).not.toHaveBeenCalled();
    expect(useUserStore().isLoggedIn).toBe(false);
  });

  it.each([['kellie@gmail.com'], ['kellie@scis.smu.edu.sg'], ['kellie.smu.edu.sg']])(
    'rejects %s before calling the server',
    async (email) => {
      const wrapper = mount(LoginPanel);

      await submit(wrapper, { email });

      expect(wrapper.find('[role="alert"]').text()).toBe('Please enter a valid SMU email.');
      expect(mock.history.post).toHaveLength(0);
    },
  );

  it('clears the previous error on the next attempt', async () => {
    mock.resetHandlers();
    mock.onPost('/login').replyOnce(401, { error: 'Wrong password.' });
    mock.onPost('/login').reply(200, { user: { _id: 'u1', userName: EMAIL } });
    const wrapper = mount(LoginPanel);

    await submit(wrapper);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await submit(wrapper);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(routing.push).toHaveBeenCalledWith('/home');
  });
});

describe('LoginPanel password field', () => {
  it.each([
    ['a successful log in', 200, {}],
    ['a wrong password', 401, {}],
    ['an invalid email', 200, { email: 'kellie@gmail.com' }],
  ])('is cleared after %s', async (label, status, fields) => {
    answerLogin((handler) => handler.reply(status, { user: { _id: 'u1', userName: EMAIL } }));
    const wrapper = mount(LoginPanel);

    await submit(wrapper, fields);

    expect(wrapper.find('#login-password').element.value).toBe('');
  });
});

describe('LoginPanel remember me', () => {
  it('stores the email when asked and fills it in next time', async () => {
    const first = mount(LoginPanel);
    await first.find('#login-remember').setValue(true);
    await submit(first);

    expect(localStorage.getItem('email')).toBe(EMAIL);
    expect(localStorage.getItem('rememberUser')).toBe('true');

    const next = mount(LoginPanel);
    await flushPromises();
    expect(next.find('#login-email').element.value).toBe(EMAIL);
    expect(next.find('#login-remember').element.checked).toBe(true);
  });

  it('forgets the remember me choice when it is unticked', async () => {
    localStorage.setItem('email', 'someone.else@smu.edu.sg');
    localStorage.setItem('rememberUser', 'true');
    const wrapper = mount(LoginPanel);
    await flushPromises();
    expect(wrapper.find('#login-email').element.value).toBe('someone.else@smu.edu.sg');
    expect(wrapper.find('#login-remember').element.checked).toBe(true);

    await wrapper.find('#login-remember').setValue(false);
    await submit(wrapper);

    expect(localStorage.getItem('email')).toBeNull();
    expect(localStorage.getItem('rememberUser')).toBeNull();
    const next = mount(LoginPanel);
    await flushPromises();
    expect(next.find('#login-email').element.value).toBe('');
    expect(next.find('#login-remember').element.checked).toBe(false);
  });

  it('starts empty when nothing was remembered', async () => {
    const wrapper = mount(LoginPanel);
    await flushPromises();

    expect(wrapper.find('#login-email').element.value).toBe('');
    expect(wrapper.find('#login-remember').element.checked).toBe(false);
  });
});
