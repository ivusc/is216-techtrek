import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityFilters from '@/components/opportunities/OpportunityFilters.vue';

function mountFilters(props) {
  return mount(OpportunityFilters, {
    props: {
      tab: 'overview',
      themes: ['AI', 'Fintech'],
      jobField: '',
      jobType: '',
      theme: '',
      closingWithin: '',
      location: '',
      paidOnly: false,
      sortBy: 'closing',
      ...props,
    },
  });
}

function selectLabels(wrapper) {
  return wrapper
    .findAll('select')
    .map((select) => select.attributes('aria-label'))
    .filter(Boolean);
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

describe('OpportunityFilters', () => {
  it('shows role and work type on jobs, theme and deadline on hackathons', () => {
    const jobsTab = mountFilters({ tab: 'jobs' });
    const hackathonsTab = mountFilters({ tab: 'hackathons' });
    const overview = mountFilters({ tab: 'overview' });

    expect(selectLabels(jobsTab)).toEqual(['Sort by', 'Role', 'Work type', 'Location']);
    expect(selectLabels(hackathonsTab)).toEqual(['Sort by', 'Theme', 'Deadline', 'Location']);
    expect(hackathonsTab.find('select[aria-label="Theme"]').text()).toContain('Theme: Fintech');
    expect(selectLabels(overview)).toEqual(['Sort by', 'Location']);
    expect(overview.text()).toContain(
      'Role, work type, theme and deadline filters are on each tab',
    );
    expect(mountFilters({ jobField: 'data' }).text()).toContain(
      'Filters from the Jobs / Hackathons tabs still apply here',
    );
  });

  it('toggles the phone filter panel with aria-expanded', async () => {
    const filters = mountFilters({ location: 'Online', paidOnly: true });
    const toggle = filters.find('button[aria-controls="opportunity-filters"]');
    const panel = () => filters.find('#opportunity-filters').classes();

    expect(toggle.text()).toBe('Filters · 2');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(panel()).toEqual(expect.arrayContaining(['d-none', 'd-md-flex']));

    await toggle.trigger('click');

    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(panel()).toContain('d-flex');
    expect(panel()).not.toContain('d-none');
  });

  it('updates the filter models and emits clear', async () => {
    const filters = mountFilters({ tab: 'jobs' });

    await filters.find('select[aria-label="Work type"]').setValue('intern');
    await filters.find('select[aria-label="Location"]').setValue('Singapore');
    await button(filters, 'Paid only').trigger('click');
    await button(filters, 'Clear all').trigger('click');

    expect(filters.emitted('update:jobType')).toEqual([['intern']]);
    expect(filters.emitted('update:location')).toEqual([['Singapore']]);
    expect(filters.emitted('update:paidOnly')).toEqual([[true]]);
    expect(filters.emitted('clear')).toHaveLength(1);
  });
});
