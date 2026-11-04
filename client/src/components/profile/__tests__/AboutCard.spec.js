import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AboutCard from '@/components/profile/AboutCard.vue';

const INVITE = 'Add a short intro so team leaders know what you are into.';

describe('AboutCard', () => {
  it('counts the characters while editing', async () => {
    const wrapper = mount(AboutCard, {
      props: {
        editing: true,
        modelValue: 'Builds things',
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    });
    const textarea = wrapper.find('#profile-about');

    expect(textarea.attributes('maxlength')).toBe('500');
    expect(wrapper.text()).toContain('13 / 500');

    await textarea.setValue('Builds things people use');

    expect(wrapper.emitted('update:modelValue')).toEqual([['Builds things people use']]);
    expect(wrapper.text()).toContain('24 / 500');
  });

  it.each([
    ['the intro', 'Builds things', 'Builds things'],
    ['an invitation when there is none', '', INVITE],
  ])('shows %s when not editing', (label, about, text) => {
    const wrapper = mount(AboutCard, { props: { modelValue: about } });

    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.find('p').text()).toBe(text);
  });
});
