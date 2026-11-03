import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamFilters from '@/components/teams/TeamFilters.vue';

function mountFilters(props = {}) {
  const wrapper = mount(TeamFilters, {
    props: {
      eventOptions: ['Hack&Roll', 'NUS Fintech'],
      skillOptions: ['Figma', 'Vue.js'],
      count: 2,
      event: '',
      skills: [],
      size: '',
      openOnly: true,
      'onUpdate:event': (value) => wrapper.setProps({ event: value }),
      'onUpdate:skills': (value) => wrapper.setProps({ skills: value }),
      'onUpdate:size': (value) => wrapper.setProps({ size: value }),
      'onUpdate:openOnly': (value) => wrapper.setProps({ openOnly: value }),
      ...props,
    },
  });
  return wrapper;
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

describe('TeamFilters', () => {
  it('picks skills from the dropdown checkboxes and clears them', async () => {
    const wrapper = mountFilters();

    expect(wrapper.find('.skills-label').text()).toBe('Skills: Any');
    expect(button(wrapper, 'Clear skills')).toBeUndefined();
    await wrapper.find('#skill-Figma').setValue(true);
    await wrapper.find('#skill-Vue\\.js').setValue(true);

    expect(wrapper.props('skills')).toEqual(['Figma', 'Vue.js']);
    expect(wrapper.find('.skills-label').text()).toBe('Skills: Figma, Vue.js');

    await button(wrapper, 'Clear skills').trigger('click');

    expect(wrapper.props('skills')).toEqual([]);
  });

  it('says when there are no skills to pick', () => {
    const wrapper = mountFilters({ skillOptions: [] });

    expect(wrapper.text()).toContain('No skills yet');
  });

  it.each([
    [1, true, '1 team recruiting'],
    [3, true, '3 teams recruiting'],
    [0, false, '0 teams found'],
  ])('counts %i teams with open slots only %s', (count, openOnly, text) => {
    const wrapper = mountFilters({ count, openOnly });

    expect(wrapper.text()).toContain(text);
  });

  it('toggles open slots only and filters by event and size', async () => {
    const wrapper = mountFilters();

    await button(wrapper, 'Open slots only').trigger('click');
    await wrapper.find('[aria-label="Filter by event"]').setValue('NUS Fintech');
    await wrapper.find('[aria-label="Filter by team size"]').setValue('medium');

    expect(wrapper.props('openOnly')).toBe(false);
    expect(wrapper.props('event')).toBe('NUS Fintech');
    expect(wrapper.props('size')).toBe('medium');
  });

  it('offers Clear only while a filter is on and emits clear', async () => {
    expect(button(mountFilters(), 'Clear')).toBeUndefined();

    const wrapper = mountFilters({ anyFilter: true });
    await button(wrapper, 'Clear').trigger('click');

    expect(wrapper.emitted('clear')).toHaveLength(1);
  });
});
