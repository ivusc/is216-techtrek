import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import TeamsView from '@/views/teams/TeamsView.vue';
import { ME, LEADER, joinRequest, ledTeam, team } from '@/__tests__/fixtures/teams';
import { HACKATHONS } from '@/__tests__/fixtures/opportunities';

const route = await vi.hoisted(async () => (await import('vue')).reactive({ query: {} }));

vi.mock('vue-router', () => ({
  useRoute: () => route,
}));

const mock = new MockAdapter(serverAPI);

const NO_EVENTS = { count: 0, hackathons: [] };

beforeEach(() => {
  route.query = {};
  setActivePinia(createPinia());
  useUserStore().user = { ...ME };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function mockLists({
  teams = [team()],
  mine = [ledTeam()],
  incoming = [],
  sent = [],
  invites = [],
} = {}) {
  mock.onGet('/teams').reply(200, teams);
  mock.onGet('/teams/invites').reply(200, invites);
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

function dialog(wrapper) {
  return wrapper.find('[role="dialog"]');
}

function dialogButton(wrapper, text) {
  return dialog(wrapper)
    .findAll('button')
    .find((candidate) => candidate.text().includes(text));
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

  it('keeps Match my skills applied through a retry', async () => {
    mockLists();
    mock.onGet('/teams').reply(500, { error: 'Failed to fetch teams' });
    const wrapper = await mountTeams();
    await button(wrapper, 'Match my skills').trigger('click');

    mockLists({ teams: [team(), team({ _id: 't2', name: 'Data Divers', skills: ['Python'] })] });
    await button(wrapper, 'Retry').trigger('click');
    await flushPromises();

    expect(wrapper.find('.skills-label').text()).toBe('Skills: Vue.js');
    expect(titles(wrapper)).toContain('Byte Me');
    expect(titles(wrapper)).not.toContain('Data Divers');
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

describe('TeamsView', () => {
  it('loads teams, mine and requests, shows every team and filters by my skills when asked', async () => {
    mockLists({
      teams: [
        team(),
        team({ _id: 't2', name: 'Data Divers', skills: ['Python'] }),
        team({ _id: 't3', name: 'Pixel Pals', skills: ['vue.js'] }),
      ],
      incoming: [joinRequest()],
      sent: [joinRequest({ _id: 's1', user: ME }), joinRequest({ _id: 's2', status: 'declined' })],
    });
    const wrapper = await mountTeams();

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.find('.tab-label').text() + ' ' + tab.find('.tab-count').text())).toEqual([
      'Browse teams 4 recruiting',
      'My teams 1 team',
      'Requests 2 waiting',
    ]);
    expect(wrapper.find('.skills-label').text()).toBe('Skills: Any');
    expect(wrapper.text()).not.toContain('need your skills');
    expect(titles(wrapper)).toEqual(['Night Owls', 'Byte Me', 'Data Divers', 'Pixel Pals']);
    expect(requestsTo('/teams/m1/matches')).toHaveLength(1);

    await button(wrapper, 'Match my skills').trigger('click');

    expect(wrapper.find('.skills-label').text()).toBe('Skills: Vue.js');
    expect(wrapper.text()).toContain('2 teams need your skills');
    expect(titles(wrapper)).not.toContain('Data Divers');
    expect(titles(wrapper)).toEqual(expect.arrayContaining(['Byte Me', 'Pixel Pals']));
  });

  it('creates a team post and lands on My teams', async () => {
    mockLists();
    mock.onGet('/opportunity/hackathons').reply(200, NO_EVENTS);
    mock.onPost('/teams').reply(201, ledTeam({ _id: 'm2', name: 'Pixel Pushers' }));
    const wrapper = await mountTeams();

    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();
    await wrapper.find('[aria-label="Event name"]').setValue('Hack&Roll');
    await wrapper.find('[aria-label="Event location"]').setValue('NUS');
    await wrapper.find('[aria-label="Closing date"]').setValue('2026-11-20');
    await wrapper.find('#post-name').setValue('Pixel Pushers');
    await wrapper.find('#post-pitch').setValue('Design-led team.');
    await dialogButton(wrapper, 'Publish post').trigger('click');
    await flushPromises();

    expect(requestsTo('/opportunity/hackathons')).toHaveLength(1);
    expect(requestsTo('/opportunity/all')).toHaveLength(0);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      name: 'Pixel Pushers',
      openRoles: [],
      teamSize: 5,
      openSlots: 1,
      pitch: 'Design-led team.',
      skills: [],
      autoAccept: false,
      status: 'open',
      opportunityId: null,
      eventName: 'Hack&Roll',
      eventLocation: 'NUS',
      closesAt: '2026-11-20',
    });
    expect(wrapper.find('#post-name').exists()).toBe(false);
    expect(dialog(wrapper).text()).toContain('Pixel Pushers is live!');
    expect(button(wrapper, 'My teams').classes()).toContain('active');
    expect(requestsTo('/teams/mine')).toHaveLength(2);
  });

  it('creates a team post for a listed hackathon', async () => {
    mockLists();
    mock
      .onGet('/opportunity/hackathons')
      .reply(200, { count: HACKATHONS.length, hackathons: HACKATHONS });
    mock.onPost('/teams').reply(201, ledTeam({ _id: 'm2', name: 'Pixel Pushers' }));
    const wrapper = await mountTeams();

    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();
    await wrapper.find('#post-event').setValue('devpost-203');
    await wrapper.find('#post-name').setValue('Pixel Pushers');
    await wrapper.find('#post-pitch').setValue('Design-led team.');
    await dialogButton(wrapper, 'Publish post').trigger('click');
    await flushPromises();

    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toMatchObject({
      name: 'Pixel Pushers',
      status: 'open',
      opportunity: { source: 'devpost', externalId: '203', title: 'AI Builders Challenge' },
    });
    expect(body).not.toHaveProperty('eventName');
    expect(wrapper.find('#post-name').exists()).toBe(false);
  });

  it('opens the post form before the hackathons arrive and lists them once they do', async () => {
    mockLists();
    let answer;
    mock.onGet('/opportunity/hackathons').reply(() => new Promise((resolve) => (answer = resolve)));
    const wrapper = await mountTeams();

    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();

    expect(dialog(wrapper).exists()).toBe(true);
    expect(wrapper.find('#post-event').attributes('disabled')).toBeDefined();

    answer([200, { count: HACKATHONS.length, hackathons: HACKATHONS }]);
    await flushPromises();

    const options = wrapper.findAll('#post-event option').map((option) => option.element.value);
    expect(wrapper.find('#post-event').attributes('disabled')).toBeUndefined();
    expect(options).toEqual(expect.arrayContaining(['devpost-203', 'devpost-204', 'other']));
    expect(options).not.toContain('devpost-202');
  });

  it('waits for the latest hackathons reply when the form is closed and opened again', async () => {
    mockLists();
    const answers = [];
    mock
      .onGet('/opportunity/hackathons')
      .reply(() => new Promise((resolve) => answers.push(resolve)));
    const wrapper = await mountTeams();

    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();
    await dialogButton(wrapper, 'Cancel').trigger('click');
    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();
    answers[0]([200, NO_EVENTS]);
    await flushPromises();

    expect(wrapper.find('#post-event').attributes('disabled')).toBeDefined();

    answers[1]([200, { count: HACKATHONS.length, hackathons: HACKATHONS }]);
    await flushPromises();

    expect(wrapper.find('#post-event').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('#post-event').element.value).toBe('devpost-201');
  });

  it('says when the hackathons could not be loaded and starts on Other', async () => {
    mockLists();
    mock.onGet('/opportunity/hackathons').reply(500, { error: 'Failed to fetch hackathons.' });
    const wrapper = await mountTeams();

    await button(wrapper, 'Create team post').trigger('click');
    await flushPromises();

    expect(dialog(wrapper).text()).toContain(
      "Couldn't load Devpost hackathons. Pick Other and type the event's name.",
    );
    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(true);
  });

  it('edits and deletes a post', async () => {
    mockLists();
    mock.onGet('/opportunity/hackathons').reply(200, NO_EVENTS);
    mock.onPatch('/teams/m1').reply(200, ledTeam({ name: 'Night Owls 2' }));
    mock.onDelete('/teams/m1').reply(204);
    const wrapper = await mountTeams();

    await button(wrapper, 'My teams').trigger('click');
    await button(wrapper, 'Edit post').trigger('click');
    await flushPromises();
    expect(wrapper.find('#post-name').element.value).toBe('Night Owls');
    await wrapper.find('#post-name').setValue('Night Owls 2');
    await dialogButton(wrapper, 'Save changes').trigger('click');
    await flushPromises();

    expect(mock.history.patch[0].url).toBe('/teams/m1');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      name: 'Night Owls 2',
      openRoles: [],
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a working demo every weekend.',
      skills: ['Vue.js', 'Figma'],
      autoAccept: false,
      status: 'open',
    });

    await button(wrapper, 'Edit post').trigger('click');
    await flushPromises();
    await dialogButton(wrapper, 'Delete post').trigger('click');
    await flushPromises();

    // it asks first; Keep team goes back to the form and deletes nothing
    expect(dialog(wrapper).find('h2').text()).toBe('Delete Night Owls?');
    expect(dialog(wrapper).text()).toContain("It can't be undone.");
    await dialogButton(wrapper, 'Keep team').trigger('click');
    expect(mock.history.delete).toHaveLength(0);
    expect(dialog(wrapper).find('h2').text()).toBe('Edit team post');

    await dialogButton(wrapper, 'Delete post').trigger('click');
    await dialogButton(wrapper, 'Delete team').trigger('click');
    await flushPromises();

    expect(mock.history.delete[0].url).toBe('/teams/m1');
    expect(dialog(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain('You deleted Night Owls.');
  });

  it('says goodbye with the leaving animation after I leave a team', async () => {
    const joined = team({ _id: 'j1', name: 'Byte Me', members: [{ user: LEADER, role: 'Team lead' }, { user: ME, role: 'Designer' }] });
    mockLists({ mine: [joined] });
    mock.onPost('/teams/j1/leave').reply(204);
    const wrapper = await mountTeams();

    await button(wrapper, 'My teams').trigger('click');
    await button(wrapper, 'Leave team').trigger('click');
    await dialogButton(wrapper, 'Leave team').trigger('click');
    await flushPromises();

    expect(mock.history.post.at(-1).url).toBe('/teams/j1/leave');
    const toast = wrapper.find('.left-toast');
    expect(toast.text()).toContain('You left Byte Me.');
    // the lead is shown staying behind, not me
    expect(toast.findAll('.leave-teammate [title]').map((avatar) => avatar.attributes('title'))).toEqual(['Ivus Chua']);
  });

  it('edits a post while the event list is down without resending its close date', async () => {
    mockLists();
    mock.onGet('/opportunity/hackathons').reply(500, { error: 'Failed to fetch hackathons.' });
    mock.onPatch('/teams/m1').reply(200, ledTeam({ name: 'Night Owls 2' }));
    const wrapper = await mountTeams();

    await button(wrapper, 'My teams').trigger('click');
    await button(wrapper, 'Edit post').trigger('click');
    await flushPromises();
    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Closing date"]').element.value).toBe('2026-11-20');
    await wrapper.find('#post-name').setValue('Night Owls 2');
    await dialogButton(wrapper, 'Save changes').trigger('click');
    await flushPromises();

    const body = JSON.parse(mock.history.patch[0].data);
    expect(body.name).toBe('Night Owls 2');
    expect(body).not.toHaveProperty('closesAt');
    expect(body).not.toHaveProperty('eventName');
  });

  it('publishes a draft', async () => {
    mockLists({ mine: [ledTeam({ status: 'draft' })] });
    mock.onGet('/opportunity/hackathons').reply(200, NO_EVENTS);
    mock.onPatch('/teams/m1').reply(200, ledTeam());
    const wrapper = await mountTeams();

    await button(wrapper, 'My teams').trigger('click');
    expect(wrapper.text()).toContain('Draft');
    await button(wrapper, 'Edit post').trigger('click');
    await flushPromises();
    expect(dialogButton(wrapper, 'Delete post')).toBeUndefined();
    await dialogButton(wrapper, 'Publish post').trigger('click');
    await flushPromises();

    expect(mock.history.patch[0].url).toBe('/teams/m1');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      name: 'Night Owls',
      openRoles: [],
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a working demo every weekend.',
      skills: ['Vue.js', 'Figma'],
      autoAccept: false,
      status: 'open',
    });
  });

  it('sends a join request with role and message', async () => {
    mockLists();
    mock.onPost('/teams/t1/requests').reply(201, { _id: 'r9', status: 'pending' });
    const wrapper = await mountTeams();

    await button(wrapper, 'Request to join').trigger('click');
    await dialogButton(wrapper, 'Figma').trigger('click');
    await wrapper.find('#join-message').setValue('I design and prototype.');
    await dialogButton(wrapper, 'Send request').trigger('click');
    await flushPromises();

    expect(mock.history.post[0].url).toBe('/teams/t1/requests');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      role: 'Figma',
      message: 'I design and prototype.',
      shareProfile: true,
    });
    expect(dialog(wrapper).exists()).toBe(false);
    expect(requestsTo('/teams')).toHaveLength(2);
  });

  it('answers and withdraws requests', async () => {
    mockLists({
      incoming: [joinRequest()],
      sent: [
        joinRequest({
          _id: 's1',
          user: ME,
          team: { _id: 't1', name: 'Byte Me', event: { name: 'Hack&Roll' } },
        }),
      ],
    });
    mock.onPatch('/teams/requests/r1').reply(200, { _id: 'r1', status: 'accepted' });
    mock.onDelete('/teams/requests/s1').reply(204);
    const wrapper = await mountTeams();

    await button(wrapper, 'Requests').trigger('click');
    await flushPromises();
    const incomingLoads = requestsTo('/teams/requests/incoming').length;
    await button(wrapper, 'Accept').trigger('click');
    await flushPromises();

    expect(mock.history.patch[0].url).toBe('/teams/requests/r1');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'accepted' });
    expect(requestsTo('/teams/requests/incoming')).toHaveLength(incomingLoads + 1);

    const sentLoads = requestsTo('/teams/requests/sent').length;
    await button(wrapper, 'Withdraw').trigger('click');
    await flushPromises();

    expect(mock.history.delete[0].url).toBe('/teams/requests/s1');
    expect(requestsTo('/teams/requests/sent')).toHaveLength(sentLoads + 1);
  });

  it("shows the server's reason inside the modal", async () => {
    mockLists();
    mock.onPost('/teams/t1/requests').reply(409, { error: 'This team is not taking requests' });
    const wrapper = await mountTeams();

    await button(wrapper, 'Request to join').trigger('click');
    await dialogButton(wrapper, 'Send request').trigger('click');
    await flushPromises();

    expect(dialog(wrapper).text()).toContain('This team is not taking requests');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('saves skills from the banner and re-filters the browse list', async () => {
    mockLists({
      teams: [
        team(),
        team({ _id: 't2', name: 'Data Divers', skills: ['Figma'] }),
        team({ _id: 't3', name: 'Py Pals', skills: ['Python'] }),
      ],
    });
    mock.onPatch('/me').reply((config) => [200, { user: { ...ME, ...JSON.parse(config.data) } }]);
    const wrapper = await mountTeams();
    await button(wrapper, 'Match my skills').trigger('click');
    expect(titles(wrapper)).toContain('Byte Me');
    expect(titles(wrapper)).not.toContain('Data Divers');

    await button(wrapper, 'Edit skills').trigger('click');
    const input = dialog(wrapper).find('.skill-text');
    await input.setValue('Figma');
    await input.trigger('keydown', { key: 'Enter' });
    await dialogButton(wrapper, 'Save skills').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ skills: ['Vue.js', 'Figma'] });
    expect(dialog(wrapper).exists()).toBe(false);
    expect(wrapper.find('.skills-label').text()).toBe('Skills: Vue.js, Figma');
    expect(titles(wrapper)).toEqual(expect.arrayContaining(['Byte Me', 'Data Divers']));
    expect(titles(wrapper)).not.toContain('Py Pals');
  });
});

describe('TeamsView event link', () => {
  function eventSelect(wrapper) {
    return wrapper.find('select[aria-label="Filter by event"]');
  }

  it('filters to a hackathon without posts and starts the first team for it', async () => {
    route.query = { event: 'Lifehack' };
    mockLists();
    mock.onGet('/opportunity/hackathons').reply(200, NO_EVENTS);
    const wrapper = await mountTeams();

    expect(eventSelect(wrapper).element.value).toBe('Lifehack');
    const options = eventSelect(wrapper).findAll('option');
    expect(options.map((option) => option.element.value)).toContain('Lifehack');
    expect(titles(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain('No teams are looking for members for Lifehack yet.');

    await button(wrapper, 'Start a team').trigger('click');
    await flushPromises();

    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').element.value).toBe('Lifehack');

    await dialogButton(wrapper, 'Cancel').trigger('click');
    await button(wrapper, 'See all teams').trigger('click');

    expect(eventSelect(wrapper).element.value).toBe('');
    expect(titles(wrapper)).toEqual(['Night Owls', 'Byte Me']);
  });

  it('does not offer to start a team when the hackathon only has teams the filters hide', async () => {
    route.query = { event: 'Hack&Roll' };
    mockLists({ teams: [team({ slotsOpen: 0 })], mine: [] });
    const wrapper = await mountTeams();

    expect(wrapper.text()).toContain('No teams match your filters.');
    expect(button(wrapper, 'Start a team')).toBeUndefined();

    await button(wrapper, 'Open slots only').trigger('click');

    expect(titles(wrapper)).toEqual(['Byte Me']);
  });

  it('says the filters hide your own post instead of saying nobody is recruiting', async () => {
    route.query = { event: 'Hack&Roll' };
    mockLists({ teams: [], mine: [ledTeam({ slotsOpen: 0, status: 'closed' })] });
    const wrapper = await mountTeams();

    expect(wrapper.text()).toContain('No teams match your filters.');
    expect(wrapper.text()).not.toContain('No teams are recruiting right now');
  });

  it('shows every team again when the address drops the event', async () => {
    route.query = { event: 'Lifehack' };
    mockLists();
    const wrapper = await mountTeams();
    expect(titles(wrapper)).toEqual([]);

    route.query = {};
    await flushPromises();

    expect(eventSelect(wrapper).element.value).toBe('');
    expect(titles(wrapper)).toEqual(['Night Owls', 'Byte Me']);
  });
});
