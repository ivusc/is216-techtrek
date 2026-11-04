import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SaveBar from '@/components/profile/SaveBar.vue';

function buttons(wrapper) {
  const [discard, save] = wrapper.findAll('button');
  return { discard, save };
}

describe('SaveBar', () => {
  it.each([
    ['saving', { busy: true, canSave: true }, [true, true, 'Saving…']],
    ['nothing to save', { canSave: false }, [false, true, 'Save changes']],
    ['changes to save', { canSave: true }, [false, false, 'Save changes']],
  ])('disables the buttons while %s', (label, props, [discardOff, saveOff, saveText]) => {
    const { discard, save } = buttons(mount(SaveBar, { props }));

    expect(discard.element.disabled).toBe(discardOff);
    expect(save.element.disabled).toBe(saveOff);
    expect(save.text()).toBe(saveText);
  });

  it('emits save and discard', async () => {
    const wrapper = mount(SaveBar, { props: { canSave: true } });
    const { discard, save } = buttons(wrapper);

    await save.trigger('click');
    await discard.trigger('click');

    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.emitted('discard')).toHaveLength(1);
  });

  it('shows the error only when there is one', async () => {
    const wrapper = mount(SaveBar);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    await wrapper.setProps({ error: 'Display name is required.' });

    expect(wrapper.find('[role="alert"]').text()).toBe('Display name is required.');
  });
});
