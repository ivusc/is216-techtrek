import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TrackerToolbar from '@/components/tracker/TrackerToolbar.vue';

function mountToolbar(props = {}) {
  return mount(TrackerToolbar, {
    props: {
      viewMode: 'board',
      type: '',
      deadline: '',
      hideRejected: false,
      total: 4,
      dueThisWeek: 1,
      ...props,
    },
  });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().startsWith(text));
}

describe('TrackerToolbar', () => {
  it('toggles the phone filter panel', async () => {
    const wrapper = mountToolbar();
    const toggle = wrapper.find('button[aria-controls="tracker-filters"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('#tracker-filters').classes()).toEqual(
      expect.arrayContaining(['d-none', 'd-md-flex']),
    );

    await toggle.trigger('click');

    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('#tracker-filters').classes()).toEqual(
      expect.arrayContaining(['d-flex', 'w-100']),
    );
    expect(wrapper.find('#tracker-filters').classes()).not.toContain('d-none');
  });

  it('counts the active filters on the phone button', () => {
    const wrapper = mountToolbar({ type: 'job', hideRejected: true });

    const toggle = wrapper.find('button[aria-controls="tracker-filters"]');
    expect(toggle.text()).toBe('Filters · 2');
    expect(toggle.classes()).toContain('bg-primary-subtle');
  });

  it.each([
    ['one application', 1, 0, '1 application · 0 due this week'],
    ['four applications', 4, 1, '4 applications · 1 due this week'],
    ['no applications', 0, 0, '0 applications · 0 due this week'],
  ])('summarises %s', (label, total, dueThisWeek, summary) => {
    const wrapper = mountToolbar({ total, dueThisWeek });

    expect(wrapper.text()).toContain(summary);
  });

  it('emits add and clear', async () => {
    const wrapper = mountToolbar();

    await button(wrapper, 'Add application').trigger('click');
    await button(wrapper, 'Clear all').trigger('click');

    expect(wrapper.emitted('add')).toHaveLength(1);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('updates the view, type, deadline and hide-rejected models', async () => {
    const wrapper = mountToolbar();

    await button(wrapper, 'Calendar').trigger('click');
    await wrapper.find('select[aria-label="Type"]').setValue('hackathon');
    await wrapper.find('select[aria-label="Deadline"]').setValue('overdue');
    await button(wrapper, 'Hide rejected').trigger('click');

    expect(wrapper.emitted('update:viewMode')).toEqual([['calendar']]);
    expect(wrapper.emitted('update:type')).toEqual([['hackathon']]);
    expect(wrapper.emitted('update:deadline')).toEqual([['overdue']]);
    expect(wrapper.emitted('update:hideRejected')).toEqual([[true]]);
  });
});
