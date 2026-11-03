import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamsTabs from '@/components/teams/TeamsTabs.vue';

function mountTabs() {
  const wrapper = mount(TeamsTabs, {
    props: {
      counts: { browse: 3, mine: 1, requests: 2 },
      tab: 'browse',
      'onUpdate:tab': (value) => wrapper.setProps({ tab: value }),
    },
  });
  return wrapper;
}

describe('TeamsTabs', () => {
  it('shows a count on each tab and switches between them', async () => {
    const wrapper = mountTabs();
    const tabs = () => wrapper.findAll('nav button');

    expect(tabs().map((tab) => tab.text())).toEqual(['Browse teams 3', 'My teams 1', 'Requests 2']);
    expect(tabs()[0].classes()).toContain('active');

    await tabs()[2].trigger('click');

    expect(wrapper.props('tab')).toBe('requests');
    expect(tabs()[2].classes()).toContain('active');
    expect(tabs()[0].classes()).not.toContain('active');
  });

  it('emits create', async () => {
    const wrapper = mountTabs();

    await wrapper.find('.btn-tt-accent').trigger('click');

    expect(wrapper.emitted('create')).toHaveLength(1);
  });
});
