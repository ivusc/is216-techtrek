import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RequestsPanel from '@/components/teams/RequestsPanel.vue';
import { ME, joinRequest, ledTeam } from '@/__tests__/fixtures/teams';

function mountPanel(props = {}) {
  return mount(RequestsPanel, { props: { incoming: [], sent: [], ledTeams: [], ...props } });
}

function buttons(wrapper, text) {
  return wrapper.findAll('button').filter((candidate) => candidate.text() === text);
}

const SENT_TEAM = { _id: 't1', name: 'Byte Me', event: { name: 'Hack&Roll' } };

describe('RequestsPanel', () => {
  it('explains each empty list', () => {
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('No requests yet.');
    expect(wrapper.text()).toContain('You have not asked to join any team yet.');
    expect(wrapper.text()).toContain('Teams you lead will show up here');
  });

  it('lists pending requests first and offers accept and decline only while pending', async () => {
    const accepted = joinRequest({ _id: 'r2', status: 'accepted', role: 'Vue.js', message: '' });
    const pending = joinRequest();
    const wrapper = mountPanel({ incoming: [accepted, pending] });

    expect(wrapper.text()).toContain('1 new');
    expect(buttons(wrapper, 'Accept')).toHaveLength(1);
    expect(buttons(wrapper, 'Decline')).toHaveLength(1);
    const [first, second] = wrapper.findAll('.card');
    expect(first.text()).toContain('Asking to be Figma');
    expect(first.text()).toContain('“I can design the screens.”');
    expect(second.text()).toContain('Joined as Vue.js');
    expect(second.text()).toContain('Accepted');
    expect(second.findAll('button').map((candidate) => candidate.text())).toEqual(['View profile']);

    await buttons(wrapper, 'Accept')[0].trigger('click');
    await buttons(wrapper, 'Decline')[0].trigger('click');

    expect(wrapper.emitted('answer')).toEqual([
      [pending, 'accepted', undefined],
      [pending, 'declined'],
    ]);
  });

  it('disables the answers of the request being saved', () => {
    const wrapper = mountPanel({ incoming: [joinRequest()], busyId: 'r1' });

    expect(buttons(wrapper, 'Accept')[0].attributes('disabled')).toBeDefined();
    expect(buttons(wrapper, 'Decline')[0].attributes('disabled')).toBeDefined();
  });

  it('shows a shared profile and hides one that was not shared', async () => {
    const wrapper = mountPanel({
      incoming: [
        joinRequest(),
        joinRequest({
          _id: 'r2',
          shareProfile: false,
          user: { _id: 'u3', displayName: 'Private Person', skills: [] },
        }),
      ],
    });
    const [shared, hidden] = wrapper.findAll('.card');

    expect(shared.text()).toContain('Figma');
    await shared
      .findAll('button')
      .find((candidate) => candidate.text() === 'View profile')
      .trigger('click');
    expect(shared.find('a').attributes('href')).toBe('https://github.com/ezekiel');

    await hidden
      .findAll('button')
      .find((candidate) => candidate.text() === 'View profile')
      .trigger('click');
    expect(hidden.text()).toContain('This person chose not to share their profile.');
    expect(hidden.find('a').exists()).toBe(false);
  });

  it('offers withdraw only while my request is pending', async () => {
    const pending = joinRequest({ _id: 's1', user: ME, team: SENT_TEAM });
    const declined = joinRequest({ _id: 's2', status: 'declined', user: ME, team: SENT_TEAM });
    const wrapper = mountPanel({ sent: [pending, declined] });

    expect(wrapper.text()).toContain('Byte Me · Hack&Roll');
    expect(wrapper.text()).toContain('Declined');
    expect(buttons(wrapper, 'Withdraw')).toHaveLength(1);

    await buttons(wrapper, 'Withdraw')[0].trigger('click');

    expect(wrapper.emitted('withdraw')).toEqual([[pending]]);
  });

  it('summarises the teams I lead and edits their post', async () => {
    const led = ledTeam();
    const wrapper = mountPanel({ ledTeams: [led] });

    expect(wrapper.find('.progress').attributes('aria-valuenow')).toBe('2');
    expect(wrapper.findAll('strong').at(-1).text()).toBe('2 / 4');
    expect(wrapper.text()).toContain('Kellie Jubela (you)');
    expect(wrapper.text()).toContain('+ 1 teammate not on TechTrek');
    expect(wrapper.findAll('.open-slot').map((slot) => slot.text())).toEqual([
      'Open slot · Vue.js or Figma',
      'Open slot · Vue.js or Figma',
    ]);

    await buttons(wrapper, 'Edit team post')[0].trigger('click');

    expect(wrapper.emitted('edit-team')).toEqual([[led]]);
  });

  it('lets the lead pick which open role to accept someone into', async () => {
    const request = joinRequest({ role: 'Designer', team: { ...joinRequest().team, openRoles: ['Frontend developer', 'Designer'] } });
    const wrapper = mountPanel({ incoming: [request] });

    expect(wrapper.text()).toContain('Asking to be Designer');
    const accept = () => wrapper.findAll('button').find((b) => b.text().startsWith('Accept as'));
    expect(accept().text()).toBe('Accept as Designer');

    await wrapper.find('select').setValue('Frontend developer');
    await accept().trigger('click');
    expect(wrapper.emitted('answer')).toEqual([[request, 'accepted', 'Frontend developer']]);
  });

  it('says when the role they asked for has been filled and picks an open one', () => {
    const request = joinRequest({ role: 'Designer', team: { ...joinRequest().team, openRoles: ['Backend developer'] } });
    const wrapper = mountPanel({ incoming: [request] });

    expect(wrapper.text()).toContain('Designer has been filled, so pick another open role for them.');
    expect(wrapper.findAll('button').some((b) => b.text() === 'Accept as Backend developer')).toBe(true);
  });
});
