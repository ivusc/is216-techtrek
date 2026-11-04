import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SkillInput from '@/components/teams/SkillInput.vue';

function mountInput(props = {}) {
  const wrapper = mount(SkillInput, {
    props: {
      modelValue: ['Vue.js'],
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      ...props,
    },
  });
  return wrapper;
}

async function type(wrapper, text, key = 'Enter') {
  const input = wrapper.find('input');
  await input.setValue(text);
  await input.trigger('keydown', { key });
}

function chips(wrapper) {
  return wrapper.findAll('.badge').map((chip) => chip.text());
}

describe('SkillInput', () => {
  it('adds on Enter and de-duplicates case-insensitively', async () => {
    const wrapper = mountInput();

    await type(wrapper, '  Figma ');
    await type(wrapper, 'VUE.JS');

    expect(wrapper.props('modelValue')).toEqual(['Vue.js', 'Figma']);
    expect(chips(wrapper)).toEqual(['Vue.js', 'Figma']);
    expect(wrapper.find('input').element.value).toBe('');

    await type(wrapper, '   ');

    expect(wrapper.props('modelValue')).toEqual(['Vue.js', 'Figma']);
  });

  it('removes the last chip on Backspace only when the input is empty', async () => {
    const wrapper = mountInput({ modelValue: ['Vue.js', 'Figma'] });

    await type(wrapper, 'Fig', 'Backspace');
    expect(wrapper.props('modelValue')).toEqual(['Vue.js', 'Figma']);

    await type(wrapper, '', 'Backspace');
    expect(wrapper.props('modelValue')).toEqual(['Vue.js']);
  });

  it('shows popular skills and the suggestions as buttons, each spelt once', () => {
    const wrapper = mountInput({ suggestions: ['vue.js', 'nodejs', 'Rust'] });
    const chips = wrapper.findAll('[aria-pressed]').map((chip) => chip.text());

    expect(chips).toContain('Vue.js');
    expect(chips).toContain('Figma');
    expect(chips).toContain('Rust');
    expect(chips.filter((chip) => chip === 'Node.js')).toHaveLength(1);
    expect(chips.filter((chip) => chip === 'Vue.js')).toHaveLength(1);
  });

  it('adds a skill when its button is tapped and removes it when tapped again', async () => {
    const wrapper = mountInput({ suggestions: [] });
    const chip = (name) => wrapper.findAll('[aria-pressed]').find((candidate) => candidate.text() === name);

    expect(chip('Vue.js').attributes('aria-pressed')).toBe('true');
    await chip('Figma').trigger('click');
    expect(wrapper.props('modelValue')).toEqual(['Vue.js', 'Figma']);

    await chip('Vue.js').trigger('click');
    expect(wrapper.props('modelValue')).toEqual(['Figma']);
  });

  it('shows no buttons when no suggestions are passed', () => {
    expect(mountInput().findAll('[aria-pressed]')).toHaveLength(0);
  });

  it('removes a chip', async () => {
    const wrapper = mountInput({ modelValue: ['Vue.js', 'Figma'] });

    await wrapper.find('[aria-label="Remove Vue.js"]').trigger('click');

    expect(wrapper.props('modelValue')).toEqual(['Figma']);
  });
});
