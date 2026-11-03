import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CalendarDay from '@/components/tracker/calendar/CalendarDay.vue';
import { groupEventsByDay } from '@/utils/calendar';
import { applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

const DAY = { dayOfMonth: 4, isInShownMonth: true, isWeekend: false, isToday: false, events: [] };

function mountDay(day) {
  return mount(CalendarDay, { props: { day: { ...DAY, ...day } } });
}

describe('CalendarDay', () => {
  it('shows a chip per event with its kind', async () => {
    const [saved, , interview] = applications();
    const events = [
      ...groupEventsByDay([interview])['2026-11-04'],
      ...groupEventsByDay([saved])['2026-11-06'],
    ];
    const wrapper = mountDay({ events });

    const chips = wrapper.findAll('.calendar-chip');
    expect(chips.map((chip) => chip.text())).toEqual(['Grab interview', 'Frontend Intern']);
    expect(chips[0].classes()).toContain('event-interview');
    expect(chips[1].classes()).toContain('event-job');
    expect(chips[0].attributes('title')).toBe('Interview: Data Analyst');
    expect(chips[1].attributes('title')).toBe('Deadline: Frontend Intern');

    await chips[0].trigger('click');

    expect(wrapper.emitted('open')).toEqual([[interview]]);
  });

  it.each([
    ['today', { isToday: true }, true, []],
    ['a weekend in the month', { isWeekend: true }, false, ['is-weekend']],
    [
      'a weekend outside the month',
      { isWeekend: true, isInShownMonth: false },
      false,
      ['is-outside'],
    ],
  ])('marks %s', (label, day, isToday, dayClasses) => {
    const wrapper = mountDay(day);

    expect(wrapper.find('.calendar-date').classes().includes('is-today')).toBe(isToday);
    expect(wrapper.classes().filter((name) => name.startsWith('is-'))).toEqual(dayClasses);
  });
});
