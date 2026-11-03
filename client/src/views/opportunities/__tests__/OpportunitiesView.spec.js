import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import OpportunitiesView from '@/views/opportunities/OpportunitiesView.vue';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';
import { NOW } from '@/__tests__/fixtures/applications';

const routing = vi.hoisted(() => ({ query: {} }));

vi.mock('vue-router', () => ({ useRoute: () => ({ query: routing.query }) }));

const mock = new MockAdapter(serverAPI);

const BOTH_SOURCES = {
  jobs: { count: 20, jobs: jobs(20) },
  hackathons: { count: 4, hackathons: HACKATHONS },
};

enableAutoUnmount(afterEach);

beforeEach(() => {
  routing.query = {};
  vi.setSystemTime(NOW);
  setActivePinia(createPinia());
  useUserStore().user = {
    _id: 'u1',
    userName: 'kellie.jubela@smu.edu.sg',
    displayName: 'Kellie Jubela',
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onGet('/application').reply(200, []);
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mountView() {
  const wrapper = mount(OpportunitiesView, { global: { stubs: { RouterLink: true } } });
  await flushPromises();
  return wrapper;
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

function opportunityRequests() {
  return mock.history.get.filter((config) => config.url === '/opportunity/all');
}

describe('OpportunitiesView', () => {
  it('shows the error as an alert with a retry', async () => {
    mock
      .onGet('/opportunity/all')
      .replyOnce(200, { ...BOTH_SOURCES, jobs: null })
      .onGet('/opportunity/all')
      .replyOnce(200, BOTH_SOURCES);
    const wrapper = await mountView();

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('Jobs could not be loaded right now.');

    await button(alert, 'Retry').trigger('click');
    await flushPromises();

    expect(opportunityRequests()).toHaveLength(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('24 results');
  });

  it('opens the details drawer and closes it on the backdrop, the close button and Esc', async () => {
    mock.onGet('/opportunity/all').reply(200, BOTH_SOURCES);
    const wrapper = await mountView();
    const drawer = () => wrapper.find('[role="dialog"]');
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');
    const keydownListeners = (spy) =>
      spy.mock.calls.filter(([type]) => type === 'keydown').map(([, listener]) => listener);

    async function openFirstCard() {
      await button(wrapper, 'Details').trigger('click');
      expect(drawer().exists()).toBe(true);
      expect(drawer().find('h1').text()).toBe('Build for Good');
    }

    await openFirstCard();
    await wrapper.find('.offcanvas-backdrop').trigger('click');
    expect(drawer().exists()).toBe(false);

    await openFirstCard();
    await drawer().find('button[aria-label="Close"]').trigger('click');
    expect(drawer().exists()).toBe(false);

    await openFirstCard();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(drawer().exists()).toBe(false);

    expect(keydownListeners(added)).toHaveLength(3);
    expect(keydownListeners(removed)).toEqual(keydownListeners(added));
  });
});
