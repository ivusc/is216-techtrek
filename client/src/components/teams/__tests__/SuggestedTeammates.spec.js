import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import SuggestedTeammates from '@/components/teams/SuggestedTeammates.vue';

const MATCHES = [
  {
    _id: 'u1',
    displayName: 'Kellie Jubela',
    year: 1,
    course: 'Information Systems',
    matchedSkills: ['Vue.js', 'Figma'],
    githubUrl: 'https://github.com/kelliej',
  },
  { _id: 'u2', displayName: 'Ivus Chua', matchedSkills: ['Vue.js'], githubUrl: 'javascript:x' },
];

const mock = new MockAdapter(serverAPI);
afterEach(() => mock.reset());

function mountList(props) {
  return mount(SuggestedTeammates, { props, global: { stubs: { RouterLink: RouterLinkStub } } });
}

const TEAM = { _id: 't1', name: 'TeamWin', openRoles: ['Frontend developer', 'Designer'] };

describe('SuggestedTeammates', () => {
  it('shows how many people match and their matching skills', async () => {
    const wrapper = mountList({ matches: MATCHES });

    expect(wrapper.text()).toContain('2 people match your team');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true');

    expect(wrapper.text()).toContain('Kellie Jubela');
    expect(wrapper.findAll('.matched-skill').map((chip) => chip.text())).toEqual([
      'Vue.js',
      'Figma',
      'Vue.js',
    ]);
    expect(wrapper.findAll('a[target="_blank"]').map((link) => link.attributes('href'))).toEqual([
      'https://github.com/kelliej',
    ]);
  });

  it('says so when nobody matches', () => {
    const wrapper = mountList({ matches: [] });

    expect(wrapper.text()).toContain('No one open to teams has these skills yet.');
  });

  it('invites someone in one click, for the open role that fits them', async () => {
    mock.onPost('/teams/t1/invites').reply(201, { _id: 'i1', status: 'pending' });
    const people = [{ _id: 'u3', displayName: 'Chloe Teo', matchedSkills: ['Figma'] }];
    const wrapper = mountList({ matches: people, team: { ...TEAM, openRoles: ['Frontend developer', 'Figma designer'] } });
    await wrapper.find('button').trigger('click');

    expect(wrapper.find('select').element.value).toBe('Figma designer');
    await wrapper.find('.invite-button').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userId: 'u3', role: 'Figma designer' });
    expect(wrapper.find('.invite-state').text()).toBe('Invited');
    expect(wrapper.find('.invite-button').exists()).toBe(false);
    // the team's open-role circle is told straight away
    expect(wrapper.emitted('invited')).toEqual([[{ role: 'Figma designer', user: { _id: 'u3', displayName: 'Chloe Teo', avatar: undefined } }]]);
  });

  it('can invite for another open role picked first', async () => {
    mock.onPost('/teams/t1/invites').reply(201, { _id: 'i1', status: 'pending' });
    const wrapper = mountList({ matches: [MATCHES[1]], team: TEAM });
    await wrapper.find('button').trigger('click');

    await wrapper.find('select').setValue('Designer');
    await wrapper.find('.invite-button').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userId: 'u2', role: 'Designer' });
  });

  it('shows who was already invited or asked to join, and invite errors', async () => {
    mock.onPost('/teams/t1/invites').reply(409, { error: 'Your team is already full' });
    const people = [
      { _id: 'a', displayName: 'Ann Lee', matchedSkills: ['Vue.js'], pending: 'invited' },
      { _id: 'b', displayName: 'Ben Ong', matchedSkills: ['Vue.js'], pending: 'requested' },
      { _id: 'c', displayName: 'Cal Tan', matchedSkills: ['Vue.js'], pending: null },
    ];
    const wrapper = mountList({ matches: people, team: TEAM });
    await wrapper.find('button').trigger('click');

    expect(wrapper.findAll('.invite-state').map((badge) => badge.text())).toEqual(['Invited', 'Asked to join']);
    await wrapper.find('.invite-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('Your team is already full');
  });
});
