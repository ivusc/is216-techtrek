import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CalendarMonth from '@/components/tracker/calendar/CalendarMonth.vue';
import { groupEventsByDay } from '@/utils/calendar';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => vi.setSystemTime(new Date(NOW)));
afterEach(() => vi.useRealTimers());

function mountMonth(eventsByDay = {}) {
  return mount(CalendarMonth, { props: { eventsByDay } });
}

function button(wrapper, label) {
  return wrapper
    .findAll('button')
    .find(
      (candidate) => candidate.attributes('aria-label') === label || candidate.text() === label,
    );
}

function dayNumbers(wrapper) {
  return wrapper.findAll('.calendar-day').map((day) => day.find('.calendar-date').text());
}

describe('CalendarMonth', () => {
  it('renders a Monday-first grid and navigates months', async () => {
    const wrapper = mountMonth();

    expect(wrapper.find('h2').text()).toBe('November 2026');
    expect(wrapper.findAll('.calendar-weekdays > div').map((name) => name.text())).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    const days = wrapper.findAll('.calendar-day');
    expect(days).toHaveLength(42);
    expect(dayNumbers(wrapper).slice(0, 7)).toEqual(['26', '27', '28', '29', '30', '31', '1']);
    expect(days[0].classes()).toContain('is-outside');
    expect(days[12].classes()).toContain('is-weekend');
    expect(wrapper.find('.calendar-date.is-today').text()).toBe('3');

    await button(wrapper, 'Next month').trigger('click');
    expect(wrapper.find('h2').text()).toBe('December 2026');
    expect(wrapper.findAll('.calendar-day')).toHaveLength(35);
    expect(dayNumbers(wrapper)[0]).toBe('30');
    expect(wrapper.find('.calendar-date.is-today').exists()).toBe(false);

    await button(wrapper, 'Previous month').trigger('click');
    await button(wrapper, 'Previous month').trigger('click');
    expect(wrapper.find('h2').text()).toBe('October 2026');

    await button(wrapper, 'Today').trigger('click');
    expect(wrapper.find('h2').text()).toBe('November 2026');
  });

  it('puts each event on its day and passes the click up', async () => {
    const [saved] = applications();
    const wrapper = mountMonth(groupEventsByDay([saved]));

    const day = wrapper.findAll('.calendar-day').find((cell) => cell.text().startsWith('6'));
    expect(day.find('.calendar-chip').text()).toBe('Frontend Intern');

    await day.find('.calendar-chip').trigger('click');

    expect(wrapper.emitted('open')).toEqual([[saved]]);
  });
});
