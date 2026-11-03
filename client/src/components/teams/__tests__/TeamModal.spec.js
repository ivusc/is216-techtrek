import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamModal from '@/components/teams/TeamModal.vue';

afterEach(() => vi.restoreAllMocks());

function mountModal() {
  return mount(TeamModal, {
    props: { title: 'Create a team post', subtitle: 'Advertise your open slots.' },
    slots: { default: '<p class="body-slot">Form</p>', footer: '<button>Publish</button>' },
  });
}

describe('TeamModal', () => {
  it('renders the title, subtitle and both slots in a labelled dialog', () => {
    const wrapper = mountModal();

    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Create a team post');
    expect(wrapper.find('h2').text()).toBe('Create a team post');
    expect(wrapper.text()).toContain('Advertise your open slots.');
    expect(wrapper.find('.modal-body .body-slot').text()).toBe('Form');
    expect(wrapper.find('.modal-footer button').text()).toBe('Publish');
  });

  it('closes on Esc, the overlay and the close button but not a click inside', async () => {
    const wrapper = mountModal();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await wrapper.find('.modal-body').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.find('[role="dialog"]').trigger('click');
    await wrapper.find('[aria-label="Close"]').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(3);
  });

  it('stops listening for Esc once closed', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountModal();
    const [, listener] = add.mock.calls.find(([type]) => type === 'keydown');

    wrapper.unmount();

    expect(remove).toHaveBeenCalledWith('keydown', listener);
  });
});
