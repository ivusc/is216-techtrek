import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DeleteTeamModal from '@/components/teams/DeleteTeamModal.vue';
import { ledTeam, ME, REQUESTER } from '@/__tests__/fixtures/teams';

function buttons(wrapper) {
  return wrapper.findAll('.modal-footer button');
}

describe('DeleteTeamModal', () => {
  it('says what deleting does, including the teammates who will be told', () => {
    const team = ledTeam({ members: [{ user: ME, role: 'Team lead' }, { user: REQUESTER, role: 'Designer' }] });
    const wrapper = mount(DeleteTeamModal, { props: { team } });

    expect(wrapper.find('h2').text()).toBe('Delete ' + team.name + '?');
    expect(wrapper.text()).toContain('1 teammate is taken off the team and gets a notification.');
    expect(wrapper.findAll('.avatar-stack [title]')).toHaveLength(1);
    expect(buttons(wrapper).map((button) => button.text())).toEqual(['Keep team', 'Delete team']);
  });

  it('leaves out the teammates line when the lead is alone, and emits the answers', async () => {
    const wrapper = mount(DeleteTeamModal, { props: { team: ledTeam() } });

    expect(wrapper.text()).not.toContain('taken off the team');
    await buttons(wrapper)[0].trigger('click');
    await buttons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('shows Deleting... and the error while busy', () => {
    const wrapper = mount(DeleteTeamModal, { props: { team: ledTeam(), busy: true, error: 'Team not found' } });

    expect(buttons(wrapper)[1].text()).toBe('Deleting...');
    expect(buttons(wrapper)[1].attributes('disabled')).toBeDefined();
    expect(wrapper.find('[role="alert"]').text()).toBe('Team not found');
  });
});
