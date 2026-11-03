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

  it('shows up to five suggestions not yet chosen and adds one on click', async () => {
    const wrapper = mountInput({
      suggestions: ['vue.js', 'Figma', 'SQL', 'Python', 'Go', 'Rust', 'Swift'],
    });
    const suggestions = () =>
      wrapper.findAll('.text-caption button').map((suggestion) => suggestion.text());

    expect(suggestions()).toEqual(['Figma', 'SQL', 'Python', 'Go', 'Rust']);

    await wrapper.findAll('.text-caption button')[1].trigger('click');

    expect(wrapper.props('modelValue')).toEqual(['Vue.js', 'SQL']);
    expect(suggestions()).toEqual(['Figma', 'Python', 'Go', 'Rust', 'Swift']);
  });

  it('removes a chip', async () => {
    const wrapper = mountInput({ modelValue: ['Vue.js', 'Figma'] });

    await wrapper.find('[aria-label="Remove Vue.js"]').trigger('click');

    expect(wrapper.props('modelValue')).toEqual(['Figma']);
  });
});
