import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfettiBurst from '@/components/ConfettiBurst.vue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ConfettiBurst', () => {
  it('pops confetti from both corners, then clears itself away', async () => {
    const wrapper = mount(ConfettiBurst, { props: { pieces: 10 } });

    expect(wrapper.findAll('.confetti-piece.left')).toHaveLength(10);
    expect(wrapper.findAll('.confetti-piece.right')).toHaveLength(10);
    expect(wrapper.find('.confetti-layer').attributes('aria-hidden')).toBe('true');

    vi.advanceTimersByTime(3600);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.confetti-layer').exists()).toBe(false);
  });
});
