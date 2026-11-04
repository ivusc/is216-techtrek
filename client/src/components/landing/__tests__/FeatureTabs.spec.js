import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FeatureTabs from '@/components/landing/FeatureTabs.vue';
import { features } from '@/views/landing/content';

function mountTabs(props = {}) {
  const wrapper = mount(FeatureTabs, {
    props: { features, active: 'discover', 'onUpdate:active': (value) => wrapper.setProps({ active: value }), ...props },
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    attachTo: document.body,
  });
  return wrapper;
}

const panelTitle = (wrapper) => wrapper.find('[role="tabpanel"] h3').text();

describe('FeatureTabs', () => {
  it('shows the tab you pick, with the problem it solves and a link to that page', async () => {
    const wrapper = mountTabs();

    await wrapper.findAll('[role="tab"]')[2].trigger('click');

    expect(wrapper.props('active')).toBe('team');
    expect(panelTitle(wrapper)).toBe(features[2].title);
    expect(wrapper.find('[role="tabpanel"]').text()).toContain('Solves: ' + features[2].solves);
    expect(wrapper.find('[role="tabpanel"] a').attributes('href')).toBe('/teams');
    wrapper.unmount();
  });

  it('moves between tabs with the arrow keys', async () => {
    const wrapper = mountTabs();

    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.props('active')).toBe('practise');
    await wrapper.findAll('[role="tab"]')[3].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.props('active')).toBe('discover');
    wrapper.unmount();
  });

  it('moves on by itself while on screen, until someone picks a tab', async () => {
    const wrapper = mountTabs({ shown: true });

    await wrapper.find('.tab-timer').trigger('animationend');
    expect(wrapper.props('active')).toBe('track');

    await wrapper.findAll('[role="tab"]')[0].trigger('click');
    expect(wrapper.find('.tab-timer').exists()).toBe(false);
    wrapper.unmount();
  });

  it('stays put when the page chose a tab, or when it is off screen', () => {
    expect(mountTabs({ shown: true, chosen: true }).find('.tab-timer').exists()).toBe(false);
    expect(mountTabs({ shown: false }).find('.tab-timer').exists()).toBe(false);
  });
});
