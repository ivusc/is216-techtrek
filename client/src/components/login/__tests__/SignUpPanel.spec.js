import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import SignUpPanel from '@/components/login/SignUpPanel.vue';

const routing = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: routing.push }) }));

const mock = new MockAdapter(serverAPI);

const EMAIL = 'new.user@smu.edu.sg';

beforeEach(() => {
  setActivePinia(createPinia());
  routing.push.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onPost('/register').reply(201, { user: { _id: 'u1', userName: EMAIL } });
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

async function submit(
  wrapper,
  { email = EMAIL, password = 'Password1!', confirm = password } = {},
) {
  await wrapper.find('#signup-email').setValue(email);
  await wrapper.find('#signup-password').setValue(password);
  await wrapper.find('#signup-confirm').setValue(confirm);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('SignUpPanel', () => {
  it('counts a leading space towards the eight character minimum, as the server does', async () => {
    const wrapper = mount(SignUpPanel);

    await submit(wrapper, { password: ' Abcde1!' });

    expect(mock.history.post).toHaveLength(1);
  });

  it.each([
    [
      'the email first',
      { email: 'new.user@gmail.com', password: 'abc', confirm: 'xyz' },
      'Please enter a valid SMU email.',
    ],
    [
      'matching passwords second',
      { password: 'abc', confirm: 'xyz' },
      "The passwords don't match!",
    ],
    [
      'the length third',
      { password: 'abc' },
      'Your password should be at least 8 characters long with 1 number, uppercase alphabet and symbol.',
    ],
    ['a symbol fourth', { password: 'abcdefgh' }, 'Your password should be at least 1 symbol.'],
    ['a digit fifth', { password: 'abcdefg!' }, 'Your password should be at least 1 digit.'],
    [
      'an uppercase letter last',
      { password: 'abcdef1!' },
      'Your password should be at least 1 uppercase letter.',
    ],
  ])('checks %s', async (label, fields, message) => {
    const wrapper = mount(SignUpPanel);

    await submit(wrapper, fields);

    expect(wrapper.find('[role="alert"]').text()).toBe(message);
    expect(mock.history.post).toHaveLength(0);
  });

  it.each([
    [
      'a duplicate email',
      (handler) => handler.reply(400, { error: 'Username already exists.' }),
      'This email is already in use.',
    ],
    [
      'any other 400',
      (handler) => handler.reply(400, { error: 'Please use your @smu.edu.sg email.' }),
      'Please use your @smu.edu.sg email.',
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
    mock.resetHandlers();
    answer(mock.onPost('/register'));
    const wrapper = mount(SignUpPanel);

    await submit(wrapper);

    expect(wrapper.find('[role="alert"]').text()).toBe(message);
    expect(routing.push).not.toHaveBeenCalled();
    expect(useUserStore().isLoggedIn).toBe(false);
  });

  it('registers and goes home', async () => {
    const wrapper = mount(SignUpPanel);

    await submit(wrapper, { email: 'New.User@smu.edu.sg' });

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      userName: EMAIL,
      password: 'Password1!',
    });
    expect(useUserStore().username).toBe(EMAIL);
    expect(routing.push).toHaveBeenCalledWith('/home');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
