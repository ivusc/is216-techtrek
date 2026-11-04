import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamPeople from '@/components/teams/TeamPeople.vue';
import { team, LEADER, REQUESTER } from '@/__tests__/fixtures/teams';

function mountPeople(overrides = {}) {
  return mount(TeamPeople, { props: { team: team({ slotsOpen: 2, ...overrides }) } });
}

const openSpot = (wrapper) => wrapper.find('[aria-label="Invite someone to this open spot"]');

describe('TeamPeople', () => {
  it('opens the share box with the team link when an open spot is clicked', async () => {
    const wrapper = mountPeople();

    await openSpot(wrapper).trigger('click');

    const panel = wrapper.find('.share-panel');
    expect(panel.text()).toContain('Know someone for this spot?');
    expect(panel.find('input').element.value).toBe(window.location.origin + '/teams?team=' + wrapper.props('team')._id);
    expect(panel.text()).toContain('Copy link');
    expect(panel.text()).not.toContain('Invite by SMU email');

    await openSpot(wrapper).trigger('click');
    expect(wrapper.find('.share-panel').exists()).toBe(false);
  });

  it('lets the team lead invite by email from an open spot', async () => {
    const wrapper = mountPeople({ isLeader: true, status: 'open' });

    expect(openSpot(wrapper).text()).toContain('Invite someone');
    await openSpot(wrapper).trigger('click');
    expect(wrapper.find('.share-panel').text()).toContain('Fill this spot');

    await wrapper.findAll('.share-panel button').find((button) => button.text() === 'Invite by SMU email').trigger('click');
    expect(wrapper.emitted('invite')).toEqual([['']]);
  });

  it('names the open spots after the open roles', () => {
    const wrapper = mountPeople({ openRoles: ['Designer'] });
    const spots = wrapper.findAll('[aria-label^="Invite someone"]').map((spot) => spot.find('.person-name').text() + ' / ' + spot.find('.person-role').text());

    expect(spots).toEqual(['Designer / Open role', 'Open spot / Could be you']);
  });

  it('lets the lead give a member a role, with the open roles as shortcuts', async () => {
    const wrapper = mountPeople({
      isLeader: true,
      openRoles: ['Designer'],
      members: [
        { user: LEADER, role: 'Team lead' },
        { user: REQUESTER, role: '' },
      ],
    });

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');
    await wrapper.findAll('.role-editor button').find((chip) => chip.text() === 'Designer').trigger('click');
    await wrapper.find('.role-editor').trigger('submit');

    expect(wrapper.emitted('assign-role')).toEqual([[{ userId: REQUESTER._id, role: 'Designer' }]]);

    // once the page hands back the updated team, the button says Saved
    await wrapper.setProps({ team: { ...wrapper.props('team'), members: [{ user: LEADER, role: 'Team lead' }, { user: REQUESTER, role: 'Designer' }] } });
    expect(wrapper.find('.role-editor button[type="submit"]').text()).toBe('Saved');
  });

  it('shows no role editor to members who are not the lead', async () => {
    const wrapper = mountPeople();

    await wrapper.find('.person').trigger('click');
    expect(wrapper.find('.role-editor').exists()).toBe(false);
  });

  it('gives each open role its own link that names the role', async () => {
    const wrapper = mountPeople({ openRoles: ['Pitch & business'] });
    const base = window.location.origin + '/teams?team=' + wrapper.props('team')._id;

    await wrapper.find('[aria-label="Invite someone to be the Pitch & business"]').trigger('click');
    expect(wrapper.find('.share-panel input').element.value).toBe(base + '&role=Pitch%20%26%20business');
    expect(wrapper.find('.share-panel').text()).toContain('Know someone for Pitch & business?');

    // the open spot without a role keeps the plain team link
    await wrapper.find('[aria-label="Invite someone to this open spot"]').trigger('click');
    expect(wrapper.find('.share-panel input').element.value).toBe(base);
  });

  it("passes the open spot's role on to the invite form", async () => {
    const wrapper = mountPeople({ isLeader: true, status: 'open', openRoles: ['Designer'] });

    await wrapper.find('[aria-label="Invite someone to be the Designer"]').trigger('click');
    await wrapper.findAll('.share-panel button').find((button) => button.text() === 'Invite by SMU email').trigger('click');

    expect(wrapper.emitted('invite')).toEqual([['Designer']]);
  });
});
