import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import ProfileView from '@/views/profile/ProfileView.vue';

const routing = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routing.push }),
  useRoute: () => ({ path: '/profile' }),
}));

const mock = new MockAdapter(serverAPI);

const USER = {
  _id: 'u1',
  userName: 'kellie.jubela.2025@smu.edu.sg',
  displayName: 'Kellie Jubela 2025',
  year: 1,
  course: 'Information Systems',
  about: 'Builds things people actually use.',
  skills: ['Vue.js'],
  openToTeams: true,
  githubUrl: 'https://github.com/kelliej',
};

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...USER };
  routing.push.mockReset();
});

afterEach(() => mock.reset());

function mountProfile() {
  return mount(ProfileView, { global: { stubs: { RouterLink: true } } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('ProfileView', () => {
  it('shows the profile and saves only what changed', async () => {
    mock.onPatch('/me').reply((config) => [200, { user: { ...USER, ...JSON.parse(config.data) } }]);
    const wrapper = mountProfile();

    expect(wrapper.text()).toContain('Kellie Jubela 2025');
    expect(wrapper.text()).toContain('Year 1 · Information Systems · SMU');
    expect(button(wrapper, 'Save changes')).toBeUndefined();

    await button(wrapper, 'Edit profile').trigger('click');
    await wrapper.find('#profile-name').setValue('Kellie J');
    await button(wrapper, 'Save changes').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ displayName: 'Kellie J' });
    expect(wrapper.find('h2').text()).toBe('Kellie J');
    expect(button(wrapper, 'Save changes')).toBeUndefined();
  });

  it('discards unsaved edits', async () => {
    const wrapper = mountProfile();

    await button(wrapper, 'Edit profile').trigger('click');
    await wrapper.find('#profile-name').setValue('Someone Else');
    await button(wrapper, 'Discard').trigger('click');

    expect(button(wrapper, 'Save changes')).toBeUndefined();
    expect(wrapper.find('h2').text()).toBe('Kellie Jubela 2025');
    expect(mock.history.patch).toHaveLength(0);
  });

  it('deletes the account only once a password is typed', async () => {
    mock.onDelete('/me').reply(204);
    const wrapper = mountProfile();

    expect(button(wrapper, 'Delete account').attributes('disabled')).toBeDefined();
    await wrapper.find('#delete-password').setValue('Password1!');
    expect(button(wrapper, 'Delete account').attributes('disabled')).toBeUndefined();
    await button(wrapper, 'Delete account').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.delete[0].data)).toEqual({ password: 'Password1!' });
    expect(useUserStore().isLoggedIn).toBe(false);
    expect(routing.push).toHaveBeenCalledWith('/login');
  });
});
