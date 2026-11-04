import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HowItWorks from '@/components/landing/HowItWorks.vue';
import { steps } from '@/views/landing/content';

const reached = (wrapper) => wrapper.findAll('.journey-step').map((step) => step.classes().includes('is-reached'));

describe('HowItWorks', () => {
  it('lights up the steps the line has reached as you scroll', async () => {
    const wrapper = mount(HowItWorks, { props: { steps, progress: 0 } });
    expect(reached(wrapper)).toEqual([false, false, false, false]);

    await wrapper.setProps({ progress: 0.5 });
    expect(reached(wrapper)).toEqual([true, true, false, false]);
    expect(wrapper.find('.journey-fill').attributes('style')).toContain('scaleY(0.5)');

    await wrapper.setProps({ progress: 1 });
    expect(reached(wrapper)).toEqual([true, true, true, true]);
  });
});
