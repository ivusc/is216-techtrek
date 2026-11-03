import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import AccountCard from '@/components/profile/AccountCard.vue';

const routing = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: routing.push }) }));

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg' };
  routing.push.mockReset();
});

afterEach(() => mock.reset());

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('AccountCard password', () => {
  it('changes the password and confirms', async () => {
    mock.onPatch('/me/password').reply(204);
    const wrapper = mount(AccountCard);
    const change = button(wrapper, 'Change password');

    expect(change.attributes('disabled')).toBeDefined();
    await wrapper.find('#current-password').setValue('Password1!');
    expect(change.attributes('disabled')).toBeDefined();
    await wrapper.find('#new-password').setValue('Password2!');
    expect(change.attributes('disabled')).toBeUndefined();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      currentPassword: 'Password1!',
      newPassword: 'Password2!',
    });
    expect(wrapper.find('[role="status"]').text()).toBe('Password changed.');
    expect(wrapper.find('#current-password').element.value).toBe('');
    expect(wrapper.find('#new-password').element.value).toBe('');
    expect(change.attributes('disabled')).toBeDefined();
  });

  it('shows a wrong current password and keeps what was typed', async () => {
    mock.onPatch('/me/password').reply(403, { error: 'Wrong password.' });
    const wrapper = mount(AccountCard);
    await wrapper.find('#current-password').setValue('Password9!');
    await wrapper.find('#new-password').setValue('Password2!');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('Wrong password.');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find('#current-password').element.value).toBe('Password9!');
    expect(button(wrapper, 'Change password').attributes('disabled')).toBeUndefined();
    expect(useUserStore().isLoggedIn).toBe(true);
  });
});

describe('AccountCard account', () => {
  it('keeps the account when the delete password is wrong', async () => {
    mock.onDelete('/me').reply(403, { error: 'Wrong password.' });
    const wrapper = mount(AccountCard);
    await wrapper.find('#delete-password').setValue('Password9!');

    await button(wrapper, 'Delete account').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[role="alert"]').map((alert) => alert.text())).toEqual([
      'Wrong password.',
    ]);
    expect(button(wrapper, 'Delete account').attributes('disabled')).toBeUndefined();
    expect(useUserStore().isLoggedIn).toBe(true);
    expect(routing.push).not.toHaveBeenCalled();
  });

  it('signs out', async () => {
    mock.onPost('/logout').reply(204);
    const wrapper = mount(AccountCard);

    await button(wrapper, 'Sign out').trigger('click');
    await flushPromises();

    expect(mock.history.post).toHaveLength(1);
    expect(useUserStore().isLoggedIn).toBe(false);
    expect(routing.push).toHaveBeenCalledWith('/login');
  });
});
