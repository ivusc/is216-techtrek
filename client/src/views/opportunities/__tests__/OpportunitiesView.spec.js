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

function jobRequests() {
  return mock.history.get.filter((config) => config.url === '/opportunity/jobs');
}

function titles(wrapper) {
  return wrapper.findAll('.opp-title').map((title) => title.text());
}

function serveBothSources() {
  mock.onGet('/opportunity/all').reply(200, BOTH_SOURCES);
}

describe('OpportunitiesView', () => {
  it('shows the overview with counts and the updated time', async () => {
    serveBothSources();
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('24 results');
    expect(wrapper.text()).toContain('· 1 closing this week');
    expect(wrapper.text()).toMatch(/· updated \S/);
    expect(wrapper.find('.chip-row').text()).toContain('Jobs · 20');
    expect(wrapper.find('.chip-row').text()).toContain('Hackathons · 4');

    const [hackathonSection, jobSection] = wrapper.findAll('section');
    expect(titles(hackathonSection)).toEqual([
      'Build for Good',
      'AI Builders Challenge',
      'Campus Makers',
    ]);
    expect(titles(jobSection)).toEqual([
      'Frontend Intern',
      'Backend Engineer',
      'Software Engineer 03',
      'Software Engineer 04',
      'Software Engineer 05',
      'Software Engineer 06',
    ]);
    expect(button(hackathonSection, 'See all hackathons')).toBeDefined();
    expect(button(jobSection, 'See all jobs & internships')).toBeDefined();
  });

  it('starts from the search the home page sent', async () => {
    routing.query = { search: 'ai' };
    serveBothSources();
    const wrapper = await mountView();

    expect(wrapper.find('input[aria-label="Search opportunities"]').element.value).toBe('ai');
    await button(wrapper, 'Hackathons').trigger('click');
    expect(titles(wrapper)).toEqual(['AI Builders Challenge']);
  });

  it('switches tabs and filters by keyword, location and paid only', async () => {
    serveBothSources();
    const wrapper = await mountView();
    const search = wrapper.find('input[aria-label="Search opportunities"]');

    await button(wrapper, 'Hackathons').trigger('click');
    expect(titles(wrapper)).toHaveLength(4);

    await search.setValue('ai');
    expect(titles(wrapper)).toEqual(['AI Builders Challenge']);

    await search.setValue('');
    await wrapper.find('select[aria-label="Location"]').setValue('Singapore');
    expect(titles(wrapper)).toEqual(['Build for Good', 'Campus Makers']);

    await button(wrapper, 'Paid only').trigger('click');
    expect(titles(wrapper)).toEqual(['Build for Good']);
    expect(wrapper.text()).toContain('1 results');

    await search.setValue('climate');
    expect(titles(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain('No opportunities match your filters.');
  });

  it('sorts by closing, pay and title', async () => {
    serveBothSources();
    const wrapper = await mountView();
    await button(wrapper, 'Hackathons').trigger('click');
    const sort = wrapper.find('select[aria-label="Sort by"]');

    expect(titles(wrapper)).toEqual([
      'Build for Good',
      'AI Builders Challenge',
      'Campus Makers',
      'Code for Climate',
    ]);

    await sort.setValue('pay');
    expect(titles(wrapper)).toEqual([
      'AI Builders Challenge',
      'Build for Good',
      'Code for Climate',
      'Campus Makers',
    ]);

    await sort.setValue('title');
    expect(titles(wrapper)).toEqual([
      'AI Builders Challenge',
      'Build for Good',
      'Campus Makers',
      'Code for Climate',
    ]);
  });

  it('loads more: reveals local items first, then asks for the next page', async () => {
    serveBothSources();
    mock.onGet('/opportunity/jobs').reply(200, { count: 25, jobs: jobs(25).slice(20) });
    const wrapper = await mountView();
    const loadMore = () => button(wrapper, 'Load more opportunities');

    await button(wrapper, 'Jobs').trigger('click');
    expect(titles(wrapper)).toHaveLength(9);

    await loadMore().trigger('click');
    expect(titles(wrapper)).toHaveLength(18);

    await loadMore().trigger('click');
    expect(titles(wrapper)).toHaveLength(20);
    expect(jobRequests()).toHaveLength(0);

    await loadMore().trigger('click');
    await flushPromises();

    expect(jobRequests()).toHaveLength(1);
    expect(jobRequests()[0].params).toEqual({ page: 2, sector: 'tech' });
    expect(titles(wrapper)).toHaveLength(25);
  });

  it('tracks and untracks an opportunity from a card', async () => {
    serveBothSources();
    mock.onPost('/application').reply(201, { _id: 'a1', status: 'saved' });
    mock.onDelete('/application/a1').reply(204);
    const wrapper = await mountView();
    const firstCard = () => wrapper.findAll('.opp-card')[0];

    expect(button(firstCard(), 'Track').text()).toBe('Track');
    await button(firstCard(), 'Track').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      opportunity: { title: 'Build for Good', source: 'devpost', externalId: '201' },
      status: 'saved',
    });
    expect(button(firstCard(), 'Track').text()).toBe('Tracked');

    await button(firstCard(), 'Tracked').trigger('click');
    await flushPromises();

    expect(mock.history.delete[0].url).toBe('/application/a1');
    expect(button(firstCard(), 'Track').text()).toBe('Track');
  });

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
