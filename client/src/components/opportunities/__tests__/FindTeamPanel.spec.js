import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import FindTeamPanel from '@/components/opportunities/FindTeamPanel.vue';
import CreateTeamModal from '@/components/teams/CreateTeamModal.vue';
import TeamCreatedCelebration from '@/components/teams/TeamCreatedCelebration.vue';
import InviteFriendsModal from '@/components/teams/InviteFriendsModal.vue';
import TeamDetailsModal from '@/components/teams/TeamDetailsModal.vue';
import RequestSentToast from '@/components/teams/RequestSentToast.vue';
import { ME, ledTeam, team } from '@/__tests__/fixtures/teams';

const mock = new MockAdapter(serverAPI);

const HACKATHON = { title: 'Hack&Roll', organisation: 'NUS Hackers' };

const FULL = team({ _id: 'full', name: 'Full House', slotsOpen: 0 });
const OPEN = team({ _id: 'open', name: 'Byte Me', slotsOpen: 2 });
const ELSEWHERE = team({ _id: 'other', name: 'Elsewhere', event: { name: 'Other Hack' } });
const MINE = ledTeam();

enableAutoUnmount(afterEach);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME, skills: ['Vue.js'] };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onGet('/teams').reply(200, [FULL, OPEN, ELSEWHERE]);
  mock.onGet('/teams/mine').reply(200, []);
  mock.onGet(/\/teams\/.*\/invites/).reply(200, []);
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

async function mountPanel() {
  const wrapper = mount(FindTeamPanel, {
    props: { item: HACKATHON },
    global: {
      stubs: { RouterLink: true, TrekLoader: true },
      mocks: { $router: { push: vi.fn() } },
    },
  });
  await flushPromises();
  return wrapper;
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('FindTeamPanel', () => {
  it('shows only this hackathon’s teams, open ones first, with a count', async () => {
    const wrapper = await mountPanel();
    const text = wrapper.text();

    expect(wrapper.find('#find-team-title').text()).toBe('Hack&Roll');
    expect(text).toContain('1 team is looking for members');
    expect(text).not.toContain('Elsewhere');
    expect(text.indexOf('Byte Me')).toBeLessThan(text.indexOf('Full House'));
  });

  it('lists my own team for this hackathon only', async () => {
    mock
      .onGet('/teams/mine')
      .reply(200, [MINE, { ...MINE, _id: 'm2', event: { name: 'Other Hack' } }]);
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('YOUR TEAM');
    expect(wrapper.text().match(/Night Owls/g)).toHaveLength(1);
  });

  it('still lists other teams when I have my own team for this hackathon', async () => {
    mock.onGet('/teams/mine').reply(200, [MINE]);
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('Night Owls');
    expect(wrapper.text()).toContain('Byte Me');
    expect(wrapper.text()).toContain('Full House');
  });

  it('does not ask me to be the first team when I already have one', async () => {
    mock.onGet('/teams').reply(200, []);
    mock.onGet('/teams/mine').reply(200, [MINE]);
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('Night Owls');
    expect(wrapper.text()).not.toContain('Be the first team for this hackathon');
  });

  it('does not show the empty state while loading', async () => {
    mock.onGet('/teams').reply(() => new Promise(() => {}));
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('Looking for teams');
    expect(wrapper.text()).not.toContain('Be the first team for this hackathon');
  });

  it('offers to start the first team when there are none', async () => {
    mock.onGet('/teams').reply(200, [ELSEWHERE]);
    mock.onGet('/teams/mine').reply(200, []);
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('No teams are looking for members yet');
    expect(wrapper.text()).toContain('Be the first team for this hackathon');
  });

  it('shows an error when teams cannot load', async () => {
    mock.onGet('/teams').reply(500);
    const wrapper = await mountPanel();

    expect(wrapper.text()).toContain('Could not load teams right now.');
    expect(wrapper.text()).not.toContain('Be the first team for this hackathon');
  });

  it('emits close from the close button and the backdrop', async () => {
    const wrapper = await mountPanel();

    await wrapper.find('button[aria-label="Close"]').trigger('click');
    await wrapper.find('.offcanvas-backdrop').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('opens the join form and shows the sent toast after a pending request', async () => {
    mock.onPost('/teams/open/requests').reply(201, { _id: 'r1', status: 'pending' });
    const wrapper = await mountPanel();

    // Request to join opens the team window with the request form already open inside it
    await button(wrapper, 'Request to join').trigger('click');
    const details = wrapper.findComponent(TeamDetailsModal);
    expect(details.props()).toMatchObject({ team: { _id: 'open' }, canRequest: true, startRequesting: true });

    // the window sends the request itself, then hands the result to the panel
    details.vm.$emit('sent', { _id: 'r1', status: 'pending' });
    await flushPromises();

    expect(wrapper.findComponent(TeamDetailsModal).exists()).toBe(false);
    expect(wrapper.findComponent(RequestSentToast).props('teamName')).toBe('Byte Me');
  });

  it('starts a team set to this hackathon, then celebrates and can invite', async () => {
    mock.onPost('/teams').reply(201, { ...MINE, _id: 'new', name: 'Fresh Team' });
    const wrapper = await mountPanel();

    await button(wrapper, 'Start a team').trigger('click');
    const create = wrapper.findComponent(CreateTeamModal);
    expect(create.props('initialEvent')).toBe('Hack&Roll');

    create.vm.$emit('submit', { name: 'Fresh Team', status: 'open' });
    await flushPromises();

    const celebration = wrapper.findComponent(TeamCreatedCelebration);
    expect(celebration.props('teamName')).toBe('Fresh Team');

    celebration.vm.$emit('invite');
    await flushPromises();
    expect(wrapper.findComponent(TeamCreatedCelebration).exists()).toBe(false);
    expect(wrapper.findComponent(InviteFriendsModal).props('team')).toMatchObject({ _id: 'new' });
  });

  it('does not celebrate a saved draft', async () => {
    mock.onPost('/teams').reply(201, { ...MINE, _id: 'draft', status: 'draft' });
    const wrapper = await mountPanel();

    await button(wrapper, 'Start a team').trigger('click');
    wrapper.findComponent(CreateTeamModal).vm.$emit('submit', { name: 'Draft', status: 'draft' });
    await flushPromises();

    expect(wrapper.findComponent(CreateTeamModal).exists()).toBe(false);
    expect(wrapper.findComponent(TeamCreatedCelebration).exists()).toBe(false);
  });

  it('keeps the create form open with the server error', async () => {
    mock.onPost('/teams').reply(400, { error: 'Name is required' });
    const wrapper = await mountPanel();

    await button(wrapper, 'Start a team').trigger('click');
    wrapper.findComponent(CreateTeamModal).vm.$emit('submit', { status: 'open' });
    await flushPromises();

    expect(wrapper.findComponent(CreateTeamModal).props('error')).toBe('Name is required');
  });
});
