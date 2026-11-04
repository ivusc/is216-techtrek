import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PasswordInput from '@/components/PasswordInput.vue';

function mountInput(props = {}, attrs = {}) {
  return mount(PasswordInput, { props: { modelValue: '', ...props }, attrs });
}

describe('PasswordInput', () => {
  it('starts hidden and toggles visibility with the eye button', async () => {
    const wrapper = mountInput();
    const toggle = wrapper.find('button');

    expect(wrapper.find('input').attributes('type')).toBe('password');
    expect(toggle.attributes('aria-label')).toBe('Show password');
    expect(toggle.attributes('aria-pressed')).toBe('false');

    await toggle.trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('text');
    expect(toggle.attributes('aria-label')).toBe('Hide password');
    expect(toggle.attributes('aria-pressed')).toBe('true');

    await toggle.trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('passes attributes to the input, not the wrapper', () => {
    const wrapper = mountInput(
      {},
      { id: 'pw', placeholder: 'Password', autocomplete: 'current-password' },
    );

    expect(wrapper.attributes('id')).toBeUndefined();
    expect(wrapper.find('input').attributes()).toMatchObject({
      id: 'pw',
      placeholder: 'Password',
      autocomplete: 'current-password',
    });
  });

  it('works with v-model', async () => {
    const wrapper = mountInput({ modelValue: 'abc' });

    expect(wrapper.find('input').element.value).toBe('abc');
    await wrapper.find('input').setValue('Password1!');
    expect(wrapper.emitted('update:modelValue')).toEqual([['Password1!']]);
  });

  it('shows the lock icon only when asked', () => {
    expect(mountInput().find('.bi-lock').exists()).toBe(false);
    const locked = mountInput({ lockIcon: true });
    expect(locked.find('.bi-lock').exists()).toBe(true);
    expect(locked.find('input').classes()).toContain('ps-5');
  });
});
