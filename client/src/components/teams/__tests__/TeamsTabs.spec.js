import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamsTabs from '@/components/teams/TeamsTabs.vue';

function mountTabs(counts = { browse: 3, mine: 1, requests: 2 }) {
  const wrapper = mount(TeamsTabs, {
    props: {
      counts,
      tab: 'browse',
      'onUpdate:tab': (value) => wrapper.setProps({ tab: value }),
    },
  });
  return wrapper;
}

const tabs = (wrapper) => wrapper.findAll('[role="tab"]');

describe('TeamsTabs', () => {
  it('shows each section as a card with a count, and switches between them', async () => {
    const wrapper = mountTabs();

    expect(tabs(wrapper).map((tab) => tab.find('.tab-label').text() + ' / ' + tab.find('.tab-count').text())).toEqual([
      'Browse teams / 3 recruiting',
      'My teams / 1 team',
      'Requests / 2 waiting',
    ]);
    expect(tabs(wrapper)[0].attributes('aria-selected')).toBe('true');

    await tabs(wrapper)[2].trigger('click');

    expect(wrapper.props('tab')).toBe('requests');
    expect(tabs(wrapper)[2].classes()).toContain('active');
    expect(tabs(wrapper)[0].attributes('aria-selected')).toBe('false');
  });

  it('marks Requests when something is waiting', () => {
    expect(tabs(mountTabs())[2].classes()).toContain('has-news');
    expect(tabs(mountTabs({ browse: 3, mine: 1, requests: 0 }))[2].classes()).not.toContain('has-news');
  });

  it('emits create from the create card', async () => {
    const wrapper = mountTabs();

    await wrapper.find('.create-card').trigger('click');

    expect(wrapper.emitted('create')).toHaveLength(1);
  });
});
