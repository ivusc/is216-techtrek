import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanColumn from '@/components/tracker/board/KanbanColumn.vue';
import { applications } from '@/__tests__/fixtures/applications';

const SAVED = { status: 'saved', label: 'Saved' };
const APPLIED = { status: 'applied', label: 'Applied' };

function mountColumn(cards = applications().slice(0, 1), stage = SAVED) {
  return mount(KanbanColumn, { props: { stage, applications: cards } });
}

describe('KanbanColumn', () => {
  it('emits move with the dropped id', async () => {
    const wrapper = mountColumn([], APPLIED);

    await wrapper.trigger('drop', {
      dataTransfer: { getData: (type) => (type === 'text/plain' ? 'a1' : '') },
    });

    expect(wrapper.emitted('move')).toEqual([['a1', 'applied']]);
  });

  it('lets cards be dropped on it', () => {
    const wrapper = mountColumn([]);
    const dragover = new Event('dragover', { cancelable: true });

    wrapper.element.dispatchEvent(dragover);

    expect(dragover.defaultPrevented).toBe(true);
  });

  it('emits add from the plus button and the Add button', async () => {
    const wrapper = mountColumn([]);

    await wrapper.find('button[aria-label="Add application to Saved"]').trigger('click');
    await wrapper.find('button.add-dashed').trigger('click');

    expect(wrapper.emitted('add')).toHaveLength(2);
  });

  it('shows its cards and count and passes their events up', async () => {
    const [saved] = applications();
    const wrapper = mountColumn([saved]);

    expect(wrapper.attributes('aria-label')).toBe('Saved');
    expect(wrapper.find('.badge').text()).toBe('1');
    expect(wrapper.findAll('.kanban-card')).toHaveLength(1);

    await wrapper.find('.kanban-card').trigger('click');
    await wrapper.findAll('.dropdown-item')[2].trigger('click');

    expect(wrapper.emitted('open')).toEqual([[saved]]);
    expect(wrapper.emitted('move')).toEqual([['a1', 'offer']]);
  });
});
