import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamLeftToast from '@/components/teams/TeamLeftToast.vue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const ME = { id: 'me', name: 'Kellie Jubela' };
const TEAM = [{ id: 'l1', name: 'Ivus Chua' }, { id: 'm2', name: 'Ezekiel Ng' }, { id: 'm3', name: 'Alicia Tan' }];

describe('TeamLeftToast', () => {
  it('says goodbye, shows me leaving the team behind, and closes by itself', () => {
    const wrapper = mount(TeamLeftToast, { props: { teamName: 'Byte Me', me: ME, team: TEAM } });

    expect(wrapper.text()).toContain('See you around!');
    expect(wrapper.text()).toContain('You left Byte Me. Your spot is open for someone new.');
    expect(wrapper.find('.leave-me [title="Kellie Jubela"]').exists()).toBe(true);
    expect(wrapper.findAll('.leave-teammate')).toHaveLength(2);
    expect(wrapper.find('.door-open').exists()).toBe(true);

    vi.advanceTimersByTime(5500);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('closes from the X', async () => {
    const wrapper = mount(TeamLeftToast, { props: { teamName: 'Byte Me', me: ME } });

    await wrapper.find('[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
