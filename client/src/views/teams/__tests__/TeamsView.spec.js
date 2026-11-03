import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import TeamsView from '@/views/teams/TeamsView.vue';
import { ME, joinRequest, ledTeam, team } from '@/__tests__/fixtures/teams';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function mockLists({ teams = [team()], mine = [ledTeam()], incoming = [], sent = [] } = {}) {
  mock.onGet('/teams').reply(200, teams);
  mock.onGet('/teams/mine').reply(200, mine);
  mock.onGet(/\/teams\/[^/]+\/matches$/).reply(200, []);
  mock.onGet('/teams/requests/incoming').reply(200, incoming);
  mock.onGet('/teams/requests/sent').reply(200, sent);
}

async function mountTeams() {
  const wrapper = mount(TeamsView, { global: { stubs: { RouterLink: true } } });
  await flushPromises();
  return wrapper;
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

function requestsTo(url) {
  return mock.history.get.filter((config) => config.url === url);
}

function titles(wrapper) {
  return wrapper.findAll('h3').map((title) => title.text());
}

describe('TeamsView errors', () => {
  it.each(['/teams', '/teams/mine'])(
    'shows the error with retry when loading %s fails',
    async (url) => {
      mockLists();
      mock.onGet(url).reply(500, { error: 'Failed to fetch teams' });
      const wrapper = await mountTeams();

      expect(wrapper.find('[role="alert"]').text()).toContain(
        'Could not load teams: Failed to fetch teams',
      );

      mockLists();
      await button(wrapper, 'Retry').trigger('click');
      await flushPromises();

      expect(requestsTo(url)).toHaveLength(2);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.text()).toContain('Byte Me');
    },
  );

  it('pre-filters by my skills once a retry loads the teams', async () => {
    mockLists();
    mock.onGet('/teams').reply(500, { error: 'Failed to fetch teams' });
    const wrapper = await mountTeams();

    mockLists({ teams: [team(), team({ _id: 't2', name: 'Data Divers', skills: ['Python'] })] });
    await button(wrapper, 'Retry').trigger('click');
    await flushPromises();

    expect(wrapper.find('.skills-label').text()).toBe('Skills: Vue.js');
    expect(titles(wrapper)).toEqual(['Byte Me']);
  });

  it('announces a failed answer as an alert', async () => {
    mockLists({ incoming: [joinRequest()] });
    mock.onPatch('/teams/requests/r1').reply(409, { error: 'This team is already full' });
    const wrapper = await mountTeams();

    await button(wrapper, 'Requests').trigger('click');
    await button(wrapper, 'Accept').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Could not answer the request: This team is already full',
    );
  });
});
