import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import ProfileMenu from '@/components/profile-menu/ProfileMenu.vue';

const routing = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: routing.push }) }));

const mock = new MockAdapter(serverAPI);

function mountMenu(props = {}) {
  return mount(ProfileMenu, { props, global: { stubs: { RouterLink: RouterLinkStub } } });
}

async function signOut(wrapper) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Sign out');
  await button.trigger('click');
  await flushPromises();
}

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = {
    _id: 'u1',
    userName: 'kellie.jubela@smu.edu.sg',
    displayName: 'Kellie Jubela',
  };
  routing.push.mockReset();
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe('ProfileMenu', () => {
  it('signs out and goes to the login page', async () => {
    mock.onPost('/logout').reply(204);

    await signOut(mountMenu());

    expect(mock.history.post.map((request) => request.url)).toEqual(['/logout']);
    expect(useUserStore().isLoggedIn).toBe(false);
    expect(routing.push).toHaveBeenCalledWith('/login');
  });

  it('still signs out locally when the server fails', async () => {
    mock.onPost('/logout').reply(500);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await signOut(mountMenu());

    expect(useUserStore().isLoggedIn).toBe(false);
    expect(routing.push).toHaveBeenCalledWith('/login');
  });

  it('hides the name when collapsed', () => {
    const open = mountMenu();
    const collapsed = mountMenu({ collapsed: true });

    expect(open.find('#profile').text()).toContain('Kellie Jubela');
    expect(open.find('#profile').text()).toContain('kellie.jubela@smu.edu.sg');
    expect(collapsed.find('#profile').text()).toBe('KJ');
    expect(collapsed.find('#profile').attributes('aria-label')).toBe('Open profile menu');
  });
});
