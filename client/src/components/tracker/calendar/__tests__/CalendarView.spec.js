import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CalendarView from '@/components/tracker/calendar/CalendarView.vue';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => vi.setSystemTime(new Date(NOW)));
afterEach(() => vi.useRealTimers());

describe('CalendarView', () => {
  it('emits export', async () => {
    const wrapper = mount(CalendarView, { props: { applications: applications() } });

    await wrapper.find('button.calendar-export').trigger('click');

    expect(wrapper.emitted('export')).toHaveLength(1);
  });

  it('passes opened events up from the month and the week', async () => {
    const list = applications();
    const wrapper = mount(CalendarView, { props: { applications: list } });

    await wrapper.find('.calendar-chip').trigger('click');
    await wrapper.find('.calendar-week-event').trigger('click');

    expect(wrapper.emitted('open')).toEqual([[list[3]], [list[2]]]);
  });
});
