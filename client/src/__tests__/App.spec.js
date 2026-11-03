import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import App from '@/App.vue';

const routing = vi.hoisted(() => ({ route: { meta: {} } }));

vi.mock('vue-router', () => ({ useRoute: () => routing.route }));

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        RouterView: { template: '<div id="page" />' },
        SideBar: { template: '<nav id="sidebar-stub" />' },
      },
    },
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  routing.route = { meta: {} };
});

describe('App', () => {
  it('shows a loading status until the session has been checked', async () => {
    const auth = useUserStore();
    const wrapper = mountApp();

    expect(wrapper.find('[role="status"]').text()).toBe('Loading TechTrek…');
    expect(wrapper.find('#page').exists()).toBe(false);

    auth.hasCheckedSession = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find('#page').exists()).toBe(true);
  });

  it('shows the sidebar and makes room for the tab bar only when logged in', async () => {
    const auth = useUserStore();
    auth.hasCheckedSession = true;
    const wrapper = mountApp();

    expect(wrapper.find('#sidebar-stub').exists()).toBe(false);
    expect(wrapper.find('main').classes()).not.toContain('with-tab-bar');

    auth.user = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg' };
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#sidebar-stub').exists()).toBe(true);
    expect(wrapper.find('main').classes()).toContain('with-tab-bar');
  });

  it('drops the page padding on a bare route', () => {
    useUserStore().hasCheckedSession = true;

    expect(mountApp().find('main').classes()).toEqual(expect.arrayContaining(['p-3', 'p-md-4']));

    routing.route = { meta: { bare: true } };
    expect(mountApp().find('main').classes()).not.toContain('p-3');
  });
});
