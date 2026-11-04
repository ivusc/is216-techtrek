import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import { mount } from '@vue/test-utils';
import TeamDetailsModal from '@/components/teams/TeamDetailsModal.vue';
import { team, LEADER, REQUESTER, ME } from '@/__tests__/fixtures/teams';

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME, skills: ['vue.js'] };
});

function mountDetails(overrides = {}, props = {}) {
  return mount(TeamDetailsModal, {
    props: {
      team: team({
        members: [
          { user: REQUESTER, role: 'Designer' },
          { user: LEADER, role: 'Team lead' },
        ],
        slotsOpen: 1,
        ...overrides,
      }),
      ...props,
    },
  });
}

describe('TeamDetailsModal', () => {
  it('lists the lead first, then members with their roles, then outside teammates and open spots', () => {
    const wrapper = mountDetails();
    const people = wrapper.findAll('.person').map((person) => person.find('.person-name').text() + ' / ' + person.find('.person-role').text());

    expect(people).toEqual([
      'Ivus Chua / Team lead',
      'Ezekiel Ng / Designer',
      'Teammate / Not on TechTrek',
      'Open spot / Could be you',
    ]);
    expect(wrapper.text()).toContain('3 of 4 spots filled');
    expect(wrapper.text()).toContain('1 more person needed');
  });

  it('shows a member profile with skills and links when their circle is clicked', async () => {
    const wrapper = mountDetails();

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');

    const panel = wrapper.find('.people-panel');
    expect(panel.text()).toContain('Designer · Y1 Information Systems');
    expect(panel.text()).toContain('Figma');
    expect(panel.find('a[href="https://github.com/ezekiel"]').exists()).toBe(true);

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');
    expect(wrapper.find('.people-panel').exists()).toBe(false);
  });

  it('ticks the wanted skills I have', () => {
    const wrapper = mountDetails();
    const chip = wrapper.findAll('.badge').find((badge) => badge.text() === 'Vue.js');

    expect(chip.find('.bi-check-lg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ticked skills match your profile.');
  });

  it('offers Request to join only when allowed', async () => {
    const footer = (wrapper) => wrapper.findAll('.modal-footer button').map((button) => button.text());

    expect(footer(mountDetails())).toEqual(['Close']);
    const wrapper = mountDetails({}, { canRequest: true });
    expect(footer(wrapper)).toEqual(['Close', 'Request to join']);
    await wrapper.findAll('.modal-footer button')[1].trigger('click');
    expect(wrapper.emitted('request')).toHaveLength(1);
  });
});
