import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LeaveTeamModal from '@/components/teams/LeaveTeamModal.vue';
import { team } from '@/__tests__/fixtures/teams';

function mountModal(props = {}) {
  return mount(LeaveTeamModal, { props: { team: team(), ...props } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

describe('LeaveTeamModal', () => {
  it('names the team and its event', () => {
    const wrapper = mountModal();

    expect(wrapper.find('h2').text()).toBe('Leave Byte Me?');
    expect(wrapper.text()).toContain('Hack&Roll');
  });

  it('emits confirm and close', async () => {
    const wrapper = mountModal();

    await button(wrapper, 'Leave team').trigger('click');
    await button(wrapper, 'Stay in team').trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('disables both buttons and says Leaving... while busy', () => {
    const wrapper = mountModal({ busy: true });

    expect(button(wrapper, 'Leaving...').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Stay in team').attributes('disabled')).toBeDefined();
  });

  it('shows an error', () => {
    expect(mountModal({ error: 'Could not leave' }).find('[role="alert"]').text()).toBe(
      'Could not leave',
    );
  });
});
