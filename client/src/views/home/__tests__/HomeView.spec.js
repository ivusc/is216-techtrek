import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import HomeView from '@/views/home/HomeView.vue';
import MiniCalendar from '@/components/home/MiniCalendar.vue';
import OpportunityCard from '@/components/opportunities/OpportunityCard.vue';
import TeamJoinedToast from '@/components/teams/TeamJoinedToast.vue';
import TrekLoader from '@/components/TrekLoader.vue';
import { NOW, applications } from '@/__tests__/fixtures/applications';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';

process.env.TZ = 'Asia/Singapore';

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => router,
}));

const mock = new MockAdapter(serverAPI);

const REQUEST = {
  _id: 'r1',
  status: 'pending',
  role: 'Designer',
  user: { _id: 'u2', displayName: 'Ezekiel Ng' },
  team: { _id: 't1', name: 'Byte Me' },
};
const INVITE = {
  _id: 'i1',
  message: 'Join us',
  team: {
    _id: 't2',
    name: 'Night Owls',
    event: { name: 'Hack&Roll' },
    leader: { _id: 'u3', displayName: 'Ivus Chua' },
  },
};

function opportunities() {
  const jobList = jobs(3);
  jobList[2].description = 'We design everything in Figma.';
  const hackathons = HACKATHONS.map((item) =>
    item.title === 'Campus Makers' ? { ...item, themes: ['Figma'] } : item,
  );
  return {
    jobs: { count: 3, jobs: jobList },
    hackathons: { count: hackathons.length, hackathons },
  };
}

enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.setSystemTime(new Date(NOW));
  setActivePinia(createPinia());
  useUserStore().user = {
    _id: 'u1',
    userName: 'kellie.jubela@smu.edu.sg',
    displayName: 'Kellie Jubela',
    skills: ['Figma'],
  };
  router.push.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onGet('/application').reply(200, applications());
  mock.onGet('/opportunity/all').reply(200, opportunities());
  mock.onGet('/teams').reply(200, []);
  mock
    .onGet('/teams/requests/incoming')
    .reply(200, [REQUEST, { ...REQUEST, _id: 'r2', status: 'accepted' }]);
  mock.onGet('/teams/invites').reply(200, [INVITE]);
  mock.onGet('/interview/dashboard').reply(200, { averageScore: 7 });
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mountView() {
  const wrapper = mount(HomeView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
  await flushPromises();
  return wrapper;
}

function card(wrapper, heading) {
  return wrapper
    .findAll('.card')
    .find(
      (candidate) => candidate.find('h2').exists() && candidate.find('h2').text().includes(heading),
    );
}

function stat(wrapper, label) {
  return wrapper
    .findAll('.tab-card')
    .find((candidate) => candidate.find('.tab-label').text() === label)
    .text();
}

describe('HomeView', () => {
  it('greets the user by first name with this week’s deadline count', async () => {
    const wrapper = await mountView();
    const header = wrapper.find('h1').text();

    expect(header).toBe('Good morning, Kellie');
    expect(wrapper.text()).toContain('1 deadline this week');
  });

  it('guesses a first name from the SMU email when there is no display name', async () => {
    useUserStore().user = { _id: 'u1', userName: 'kellie.jubela.2025@smu.edu.sg', skills: [] };
    const wrapper = await mountView();

    expect(wrapper.find('h1').text()).toBe('Good morning, Kellie');
  });

  it('shows the loader only on the first load', async () => {
    mock.onGet('/application').reply(() => new Promise(() => {}));
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true, TrekLoader: true } } });
    await flushPromises();

    expect(wrapper.findComponent(TrekLoader).exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Saved opportunities');
  });

  it('fills the stat cards from applications and team requests', async () => {
    const wrapper = await mountView();

    expect(stat(wrapper, 'Saved opportunities')).toContain('+1 this week');
    expect(stat(wrapper, 'Active applications')).toContain('1 at interview');
    expect(stat(wrapper, 'Deadlines this week')).toContain('Next:');
    expect(stat(wrapper, 'Team requests')).toContain('2 waiting');
    expect(stat(wrapper, 'Team requests')).toContain('1 invite for you');
  });

  it('lists upcoming deadlines soonest first, leaving out rejected and past ones', async () => {
    const wrapper = await mountView();
    const text = card(wrapper, 'Upcoming deadlines').text();

    expect(text.indexOf('Frontend Intern')).toBeGreaterThan(-1);
    expect(text.indexOf('Frontend Intern')).toBeLessThan(text.indexOf('Hack&Roll'));
    expect(text).not.toContain('Backend Engineer');
  });

  it('puts every deadline and interview on the calendar', async () => {
    const wrapper = await mountView();
    const events = wrapper.findComponent(MiniCalendar).props('events');

    expect(events.map((event) => [event.kind, event.title])).toEqual([
      ['deadline', 'Frontend Intern'],
      ['deadline', 'Hack&Roll'],
      ['interview', 'Data Analyst'],
      ['deadline', 'Backend Engineer'],
    ]);
  });

  it('recommends the best matching open job and hackathon you have not tracked', async () => {
    const wrapper = await mountView();
    const picks = wrapper
      .findAllComponents(OpportunityCard)
      .map((cardWrapper) => cardWrapper.props('item').title);

    expect(wrapper.text()).toContain('Based on your skills: Figma');
    expect(picks).toEqual(['Software Engineer 03', 'Campus Makers']);
  });

  it('tracking a pick updates the stat cards without showing the loader again', async () => {
    const wrapper = await mountView();
    const savedBefore = stat(wrapper, 'Saved opportunities');
    const pick = wrapper.findAllComponents(OpportunityCard)[0].props('item');
    mock.onPost('/application').reply(201, { _id: 'a9' });
    mock.onGet('/application').reply(200, [
      ...applications(),
      { _id: 'a9', userId: 'u1', status: 'saved', opportunityId: pick, createdAt: NOW },
    ]);

    await wrapper.findAllComponents(OpportunityCard)[0].vm.$emit('toggle-save');
    await flushPromises();

    expect(savedBefore).toContain('1 saved');
    expect(stat(wrapper, 'Saved opportunities')).toContain('2 saved');
    expect(wrapper.findComponent(TrekLoader).exists()).toBe(false);
  });

  it('says when there are no picks to recommend', async () => {
    mock.onGet('/opportunity/all').reply(200, { jobs: null, hackathons: null });
    const wrapper = await mountView();

    expect(wrapper.findAllComponents(OpportunityCard)).toHaveLength(0);
    expect(wrapper.text()).toContain('No open picks right now.');
  });

  it('says fresh picks when the user has no skills yet', async () => {
    useUserStore().user = { _id: 'u1', displayName: 'Kellie', skills: [] };
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('Fresh picks for you');
  });

  it('shows pending requests and invites, and the practice score', async () => {
    const wrapper = await mountView();
    const text = card(wrapper, 'Team requests').text();

    expect(text).toContain('Ezekiel Ng');
    expect(text).toContain('Designer');
    expect(text).toContain('Night Owls');
    expect(text).toContain('"Join us"');
    expect(wrapper.text()).toContain('Average score 7/10');
  });

  it('still shows the dashboard when team requests fail to load', async () => {
    mock.onGet('/teams/requests/incoming').reply(500);
    mock.onGet('/teams/invites').reply(500);
    const wrapper = await mountView();

    expect(stat(wrapper, 'Team requests')).toContain('All caught up');
    expect(wrapper.text()).toContain('Upcoming deadlines');
  });

  it('accepting a request answers it, shows the joined toast and reloads', async () => {
    mock.onPatch('/teams/requests/r1').reply(200, {});
    const wrapper = await mountView();
    mock.onGet('/teams/requests/incoming').reply(200, []);

    // the button names the role they asked for
    await wrapper.find('button[aria-label="Accept as Designer"]').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'accepted' });
    expect(wrapper.findComponent(TeamJoinedToast).props()).toMatchObject({
      title: 'Welcome aboard!',
      message: 'Ezekiel Ng joined Byte Me as Designer.',
    });
    // the list reloaded, so the answered request is gone
    expect(wrapper.find('button[aria-label^="Accept as"]').exists()).toBe(false);
  });

  it('declining a request shows no toast', async () => {
    mock.onPatch('/teams/requests/r1').reply(200, {});
    const wrapper = await mountView();

    await wrapper.find('button[aria-label="Decline request"]').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'declined' });
    expect(wrapper.findComponent(TeamJoinedToast).exists()).toBe(false);
  });

  it('accepting an invite shows the you-are-in toast', async () => {
    mock.onPatch('/teams/invites/i1').reply(200, {});
    const wrapper = await mountView();

    await wrapper.find('button[aria-label="Join Night Owls"]').trigger('click');
    await flushPromises();

    expect(wrapper.findComponent(TeamJoinedToast).props()).toMatchObject({
      title: "You're in!",
      message: 'You joined Night Owls. Say hi to your new team.',
    });
  });

  it('shows an error when answering fails', async () => {
    mock.onPatch('/teams/requests/r1').reply(409, { error: 'Team is full' });
    mock.onPatch('/teams/invites/i1').reply(404, { error: 'Invite not found' });
    const wrapper = await mountView();

    await wrapper.find('button[aria-label="Accept as Designer"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Could not answer the request: Team is full');

    await wrapper.find('button[aria-label="Decline invite to Night Owls"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Could not answer the invite: Invite not found');
  });

  it('searching from the header opens Opportunities with the search', async () => {
    const wrapper = await mountView();
    const input = wrapper.find('header input, input[type="search"], input');

    await input.setValue('  intern ');
    await input.trigger('keydown', { key: 'Enter' });

    expect(router.push).toHaveBeenCalledWith({
      path: '/opportunities',
      query: { search: 'intern' },
    });
  });
});
