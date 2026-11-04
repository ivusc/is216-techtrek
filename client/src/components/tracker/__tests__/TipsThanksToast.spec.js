import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TipsThanksToast from '@/components/tracker/TipsThanksToast.vue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('TipsThanksToast', () => {
  it('thanks me for sharing, then closes by itself', () => {
    const wrapper = mount(TipsThanksToast, { props: { organisation: 'Grab' } });

    expect(wrapper.text()).toContain('Thank you for sharing!');
    expect(wrapper.text()).toContain('You just helped the next SMU student preparing for Grab.');
    vi.advanceTimersByTime(5500);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('says the tips were updated after an edit and closes from the X', async () => {
    const wrapper = mount(TipsThanksToast, { props: { organisation: 'Grab', edited: true } });

    expect(wrapper.text()).toContain('Tips updated, thank you!');
    await wrapper.find('[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
