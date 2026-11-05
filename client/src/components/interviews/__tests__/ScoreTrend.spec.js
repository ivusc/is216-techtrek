import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ScoreTrend from '@/components/interviews/ScoreTrend.vue';

const POINTS = [
  { completedAt: '2026-11-01T09:00:00Z', score: 5 },
  { completedAt: '2026-11-02T09:00:00Z', score: 6.4 },
  { completedAt: '2026-11-04T09:00:00Z', score: 8.5 },
];

describe('ScoreTrend', () => {
  it('draws one dot per session, joined by a line, and labels the latest score', () => {
    const wrapper = mount(ScoreTrend, { props: { points: POINTS } });

    expect(wrapper.findAll('.trend-dot')).toHaveLength(3);
    expect(wrapper.find('.trend-line').attributes('points').split(' ')).toHaveLength(3);
    expect(wrapper.find('.trend-label').text()).toBe('8.5');
    expect(wrapper.find('figcaption').text()).toBe('5 → 8.5 over 3 sessions');
    expect(wrapper.find('svg').attributes('aria-label')).toBe('Score trend: 5 → 8.5 over 3 sessions');
  });

  it('puts higher scores higher up', () => {
    const wrapper = mount(ScoreTrend, { props: { points: POINTS } });
    const heights = wrapper.findAll('.trend-dot').map((dot) => Number(dot.attributes('cy')));

    expect(heights[0]).toBeGreaterThan(heights[1]);
    expect(heights[1]).toBeGreaterThan(heights[2]);
  });

  it('shows each session on hover', () => {
    const wrapper = mount(ScoreTrend, { props: { points: POINTS } });

    expect(wrapper.find('.trend-dot title').text()).toBe('1 Nov: 5 / 10');
  });

  it('shows a single session as one dot with no line', () => {
    const wrapper = mount(ScoreTrend, { props: { points: [POINTS[0]] } });

    expect(wrapper.findAll('.trend-dot')).toHaveLength(1);
    expect(wrapper.find('.trend-line').exists()).toBe(false);
    expect(wrapper.find('figcaption').text()).toBe('5 / 10 after 1 session');
  });

  it('invites a first session when there is nothing yet', () => {
    const wrapper = mount(ScoreTrend, { props: { points: [] } });

    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toContain('Finish a session to start your score trend.');
  });
});
