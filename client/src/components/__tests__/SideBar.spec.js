import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import SideBar from '@/components/SideBar.vue';

const PAGES = ['/home', '/opportunities', '/tracker', '/teams', '/interview', '/profile', '/login'];

function stubScreen({ belowLg }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: belowLg })),
  );
}

async function mountSideBar(path = '/tracker') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: PAGES.map((page) => ({ path: page, component: { template: '<div />' } })),
  });
  await router.push(path);
  return mount(SideBar, { global: { plugins: [router] } });
}

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = {
    _id: 'u1',
    userName: 'kellie.jubela@smu.edu.sg',
    displayName: 'Kellie Jubela',
  };
  stubScreen({ belowLg: false });
});

afterEach(() => vi.unstubAllGlobals());

function sidebarWidth(wrapper) {
  return wrapper.find('#sidebar').element.style.width;
}

function toggleButton(wrapper) {
  return wrapper.find('#sidebar button');
}

describe('SideBar', () => {
  it('starts collapsed below lg', async () => {
    stubScreen({ belowLg: true });
    const wrapper = await mountSideBar();

    expect(sidebarWidth(wrapper)).toBe('80px');
    expect(toggleButton(wrapper).attributes('aria-label')).toBe('Expand sidebar');
  });

  it('starts open from lg', async () => {
    const wrapper = await mountSideBar();

    expect(sidebarWidth(wrapper)).toBe('260px');
    expect(toggleButton(wrapper).attributes('aria-label')).toBe('Collapse sidebar');
  });

  it('collapses and expands from the toggle', async () => {
    const wrapper = await mountSideBar();

    await toggleButton(wrapper).trigger('click');
    expect(sidebarWidth(wrapper)).toBe('80px');
    expect(wrapper.find('#sidebar a[href="/teams"]').attributes('title')).toBe('Teams');

    await toggleButton(wrapper).trigger('click');
    expect(sidebarWidth(wrapper)).toBe('260px');
    expect(wrapper.find('#sidebar a[href="/teams"]').attributes('title')).toBeUndefined();
  });

  it('marks only the current page with aria-current', async () => {
    const marked = {};
    for (const path of ['/tracker', '/home']) {
      const wrapper = await mountSideBar(path);
      marked[path] = ['#sidebar ul.nav', '.bottom-nav'].map((menu) =>
        wrapper.findAll(`${menu} [aria-current="page"]`).map((link) => link.attributes('href')),
      );
    }

    expect(marked).toEqual({
      '/tracker': [['/tracker'], ['/tracker']],
      '/home': [['/home'], ['/home']],
    });
  });

  it('uses the short labels in the tab bar', async () => {
    const wrapper = await mountSideBar();

    const labels = wrapper.findAll('.bottom-nav a').map((link) => link.text());
    expect(labels).toEqual(['Home', 'Discover', 'Tracker', 'Teams', 'Prep']);
  });
});
