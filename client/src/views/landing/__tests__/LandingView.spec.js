import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import LandingView from '@/views/landing/LandingView.vue';
import FeatureTabs from '@/components/landing/FeatureTabs.vue';
import { features, problems } from '@/views/landing/content';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  mock.reset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function mountLanding() {
  const wrapper = mount(LandingView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' } } }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

const statText = (wrapper) =>
  wrapper.findAll('.stat-card').map((card) => card.find('.text-stat').text() + ' ' + card.find('.small').text());

describe('LandingView', () => {
  it('follows the proposal: the problem, then the features and how they fit together', async () => {
    mock.onGet('/opportunity/hackathons').reply(200, { hackathons: [] });
    mock.onGet('/opportunity/jobs').reply(200, { count: 0, jobs: [] });
    const wrapper = await mountLanding();

    for (const id of ['top', 'problem', 'features', 'how', 'extras', 'join']) {
      expect(wrapper.find('#' + id).exists()).toBe(true);
    }
    expect(wrapper.find('h1').text()).toContain('at SMU, in one place.');
    expect(wrapper.findAll('.flip-card')).toHaveLength(problems.length);
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(features.length);
    // no team or technology sections
    expect(wrapper.find('#team').exists()).toBe(false);
    expect(wrapper.find('#tech').exists()).toBe(false);
    wrapper.unmount();
  });

  it('counts up to the real numbers from the API', async () => {
    mock.onGet('/opportunity/hackathons').reply(200, { hackathons: Array.from({ length: 51 }, (_, i) => ({ id: i })) });
    mock.onGet('/opportunity/jobs').reply(200, { count: 25148, jobs: [] });
    const wrapper = await mountLanding();

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(statText(wrapper)).toEqual(['51 open hackathons right now', '25,148 tech jobs in Singapore', '4 tools in one app']);
    wrapper.unmount();
  });

  it('leaves out a number that could not load', async () => {
    mock.onGet('/opportunity/hackathons').reply(500);
    mock.onGet('/opportunity/jobs').reply(200, { count: 10, jobs: [] });
    const wrapper = await mountLanding();
    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(statText(wrapper)).toEqual(['10 tech jobs in Singapore', '4 tools in one app']);
    wrapper.unmount();
  });

  it('swaps the word in the headline every few seconds', async () => {
    mock.onGet(/.*/).reply(200, { hackathons: [], count: 0, jobs: [] });
    const wrapper = await mountLanding();
    const word = () => wrapper.find('.word').text();

    expect(word()).toBe('opportunity');
    vi.advanceTimersByTime(2400);
    await flushPromises();
    expect(word()).toBe('internship');
    wrapper.unmount();
  });

  it("opens the matching feature tab from a problem card's See how", async () => {
    mock.onGet(/.*/).reply(200, { hackathons: [], count: 0, jobs: [] });
    const wrapper = await mountLanding();

    await wrapper.findAll('.face-problem')[3].trigger('click');
    await wrapper.findAll('.face-solution')[3].find('.btn-light').trigger('click');

    expect(wrapper.findComponent(FeatureTabs).props()).toMatchObject({ active: 'team', chosen: true });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('offers Sign up to guests and Open TechTrek to people who are logged in', async () => {
    mock.onGet(/.*/).reply(200, { hackathons: [], count: 0, jobs: [] });
    const guest = await mountLanding();
    expect(guest.text()).toContain("Get started, it's free");
    expect(guest.text()).not.toContain('Open TechTrek');
    guest.unmount();

    useUserStore().user = { _id: 'u1', displayName: 'Kellie' };
    const member = await mountLanding();
    expect(member.text()).toContain('Open TechTrek');
    expect(member.text()).not.toContain('Create your account');
    member.unmount();
  });
});
