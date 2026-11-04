import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ProblemCards from '@/components/landing/ProblemCards.vue';
import { problems } from '@/views/landing/content';

const flippedCount = (wrapper) => wrapper.findAll('.flip-card.is-flipped').length;

describe('ProblemCards', () => {
  it('shows every problem first, and the switch flips them all to the fix and back', async () => {
    const wrapper = mount(ProblemCards, { props: { problems } });
    const [without, withTechTrek] = wrapper.findAll('.mode-switch button');

    expect(flippedCount(wrapper)).toBe(0);
    expect(without.attributes('aria-pressed')).toBe('true');

    await withTechTrek.trigger('click');
    expect(flippedCount(wrapper)).toBe(problems.length);
    expect(withTechTrek.attributes('aria-pressed')).toBe('true');

    await without.trigger('click');
    expect(flippedCount(wrapper)).toBe(0);
  });

  it('flips one card when it is tapped, and Back turns it round again', async () => {
    const wrapper = mount(ProblemCards, { props: { problems } });

    await wrapper.findAll('.face-problem')[1].trigger('click');
    expect(wrapper.findAll('.flip-card')[1].classes()).toContain('is-flipped');
    expect(flippedCount(wrapper)).toBe(1);

    await wrapper.findAll('.face-solution')[1].findAll('button')[1].trigger('click');
    expect(flippedCount(wrapper)).toBe(0);
  });

  it('asks the page to show the matching feature', async () => {
    const wrapper = mount(ProblemCards, { props: { problems } });

    await wrapper.findAll('.face-solution')[0].find('.btn-light').trigger('click');

    expect(wrapper.emitted('see-feature')).toEqual([[problems[0].feature]]);
  });
});
