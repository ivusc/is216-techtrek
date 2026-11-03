import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CalendarThisWeek from '@/components/tracker/calendar/CalendarThisWeek.vue';
import { groupEventsByDay } from '@/utils/calendar';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => vi.setSystemTime(new Date(NOW)));
afterEach(() => vi.useRealTimers());

function deadlineOn(id, deadline) {
  return { ...applications()[0], _id: id, deadline };
}

describe('CalendarThisWeek', () => {
  it('says nothing is due', () => {
    const wrapper = mount(CalendarThisWeek, { props: { eventsByDay: {} } });

    expect(wrapper.text()).toContain('Nothing due in the next 7 days.');
  });

  it('groups the next seven days', async () => {
    const list = [
      ...applications(),
      deadlineOn('today', '2026-11-03T10:00:00.000Z'),
      deadlineOn('day-7', '2026-11-10T04:00:00.000Z'),
      deadlineOn('day-8', '2026-11-11T04:00:00.000Z'),
    ];
    const wrapper = mount(CalendarThisWeek, { props: { eventsByDay: groupEventsByDay(list) } });

    expect(wrapper.findAll('.text-overline').map((heading) => heading.text())).toEqual([
      'Tue 3 Nov',
      'Wed 4 Nov',
      'Fri 6 Nov',
      'Tue 10 Nov',
    ]);
    const rows = wrapper.findAll('.calendar-week-event');
    expect(rows.map((row) => row.text())).toEqual([
      'Frontend Intern6:00 pm · Deadline',
      'Data Analyst2:00 pm · Interview',
      'Frontend Intern11:59 pm · Deadline',
      'Frontend Intern12:00 pm · Deadline',
    ]);
    expect(rows[1].classes()).toContain('event-interview');

    await rows[1].trigger('click');

    expect(wrapper.emitted('open')).toEqual([[list[2]]]);
  });
});
