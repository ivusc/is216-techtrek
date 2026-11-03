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

describe('SideBar', () => {
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
});
