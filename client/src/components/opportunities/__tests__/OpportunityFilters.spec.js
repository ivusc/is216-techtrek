import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityFilters from '@/components/opportunities/OpportunityFilters.vue';

const SECTORS = [
  {
    key: 'tech',
    label: 'Tech',
    roles: [
      { key: 'frontend', label: 'Frontend' },
      { key: 'data', label: 'Data' },
    ],
  },
  { key: 'finance', label: 'Finance & Accounting', roles: [{ key: 'audit', label: 'Audit' }] },
  { key: 'all', label: 'All sectors', roles: [] },
];

function mountFilters(props) {
  return mount(OpportunityFilters, {
    props: {
      tab: 'overview',
      themes: ['AI', 'Fintech'],
      sectors: SECTORS,
      jobSector: 'tech',
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

    expect(selectLabels(jobsTab)).toEqual(['Sort by', 'Sector', 'Role', 'Work type', 'Location']);
    expect(jobsTab.find('select[aria-label="Role"]').text()).toContain('Role: Data');
    expect(selectLabels(mountFilters({ tab: 'jobs', jobSector: 'all' }))).toEqual([
      'Sort by',
      'Sector',
      'Work type',
      'Location',
    ]);
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

  it('clears the role when another sector is picked and counts a sector other than Tech', async () => {
    const filters = mountFilters({ tab: 'jobs', jobField: 'data' });

    await filters.find('select[aria-label="Sector"]').setValue('finance');

    expect(filters.emitted('update:jobField')).toEqual([['']]);
    expect(filters.emitted('update:jobSector')).toEqual([['finance']]);
    expect(
      mountFilters({ jobSector: 'finance' })
        .find('button[aria-controls="opportunity-filters"]')
        .text(),
    ).toBe('Filters · 1');
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
