import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamPeople from '@/components/teams/TeamPeople.vue';
import { team } from '@/__tests__/fixtures/teams';

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
    expect(wrapper.emitted('invite')).toHaveLength(1);
  });
});
