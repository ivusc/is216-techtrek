import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityTabs from '@/components/opportunities/OpportunityTabs.vue';

function mountTabs(props) {
  return mount(OpportunityTabs, {
    props: { counts: { jobs: 20, hackathons: 4 }, tab: 'overview', viewMode: 'grid', ...props },
  });
}

function texts(buttons) {
  return buttons.map((button) => button.text().replace(/\s+/g, ' '));
}

describe('OpportunityTabs', () => {
  it('shows counts on both the chips and the tabs', () => {
    const tabs = mountTabs({ tab: 'jobs' });
    const chips = tabs.findAll('.chip-row button');

    expect(texts(chips)).toEqual(['Overview', 'Jobs · 20', 'Hackathons · 4']);
    expect(chips.map((chip) => chip.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(texts(tabs.findAll('.nav-underline button'))).toEqual([
      'Overview',
      'Jobs & internships 20',
      'Hackathons 4',
    ]);
    expect(tabs.find('.nav-underline .active').text()).toContain('Jobs & internships');
  });

  it('updates the tab and view mode models', async () => {
    const tabs = mountTabs();

    await tabs.findAll('.chip-row button')[2].trigger('click');
    await tabs.findAll('.nav-underline button')[1].trigger('click');
    await tabs
      .findAll('.btn-group button')
      .find((button) => button.text() === 'List')
      .trigger('click');

    expect(tabs.emitted('update:tab')).toEqual([['hackathons'], ['jobs']]);
    expect(tabs.emitted('update:viewMode')).toEqual([['list']]);
  });
});
