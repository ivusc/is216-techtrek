import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SkillPicker from '@/components/SkillPicker.vue';
import { popularSkills } from '@/constants';

function setUp(skills = []) {
  const wrapper = mount(SkillPicker, {
    props: {
      modelValue: skills,
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
    },
  });
  return wrapper;
}

function chip(wrapper, skill) {
  return wrapper.findAll('button[aria-pressed]').find((button) => button.text() === skill);
}

describe('SkillPicker', () => {
  it('shows a chip for every popular skill and the count', () => {
    const wrapper = setUp(['Rust']);

    expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(popularSkills.length);
    expect(wrapper.text()).toContain('1 of 12');
  });

  it('marks chips you already have, across spellings', () => {
    const [first] = popularSkills;
    const wrapper = setUp([first.toLowerCase()]);

    expect(chip(wrapper, first).attributes('aria-pressed')).toBe('true');
    expect(chip(wrapper, popularSkills[1]).attributes('aria-pressed')).toBe('false');
  });

  it('adds and removes a skill when its chip is clicked', async () => {
    const [first] = popularSkills;
    const wrapper = setUp(['Rust']);

    await chip(wrapper, first).trigger('click');
    expect(wrapper.props('modelValue')).toEqual(['Rust', first]);

    await chip(wrapper, first).trigger('click');
    expect(wrapper.props('modelValue')).toEqual(['Rust']);
  });

  it('does not add past 12 skills', async () => {
    const full = Array.from({ length: 12 }, (_, i) => `Skill ${i}`);
    const wrapper = setUp(full);

    await chip(wrapper, popularSkills[0]).trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
