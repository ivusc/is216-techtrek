import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MiniCalendar from '@/components/home/MiniCalendar.vue';
import { NOW } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

const EVENTS = [
  {
    date: '2026-11-03T23:59:00+08:00',
    kind: 'deadline',
    title: 'Frontend Intern',
    organisation: 'Acme',
  },
  {
    date: '2026-11-03T14:00:00+08:00',
    kind: 'interview',
    title: 'Data Intern',
    organisation: 'Shopee',
  },
  { date: '2026-11-10T10:00:00+08:00', kind: 'deadline', title: 'Hack&Roll' },
];

beforeEach(() => vi.setSystemTime(new Date(NOW)));
afterEach(() => vi.useRealTimers());

function mountCalendar(events = EVENTS) {
  return mount(MiniCalendar, {
    props: { events },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

function day(wrapper, label) {
  return wrapper
    .findAll('.mini-cell')
    .find((cell) => cell.attributes('aria-label').startsWith(label));
}

function button(wrapper, label) {
  return wrapper.find(`button[aria-label="${label}"]`);
}

describe('MiniCalendar', () => {
  it('shows this month in 6 weeks starting on a Monday, with today selected', () => {
    const wrapper = mountCalendar();
    const cells = wrapper.findAll('.mini-cell');

    expect(wrapper.find('h2').text()).toBe('November 2026');
    expect(cells).toHaveLength(42);
    expect(cells[0].attributes('aria-label')).toMatch(/^26 October/);
    expect(day(wrapper, '3 November').attributes('aria-pressed')).toBe('true');
  });

  it('adds one dot per kind of event and counts them for screen readers', () => {
    const wrapper = mountCalendar();

    expect(day(wrapper, '3 November').attributes('aria-label')).toBe('3 November, 2 events');
    expect(
      day(wrapper, '3 November')
        .findAll('.mini-dot')
        .map((dot) => dot.classes())
        .flat(),
    ).toEqual(expect.arrayContaining(['dot-deadline', 'dot-interview']));
    expect(day(wrapper, '10 November').attributes('aria-label')).toBe('10 November, 1 event');
    expect(day(wrapper, '4 November').attributes('aria-label')).toBe('4 November');
  });

  it("lists today's events, interviews first with their time", () => {
    const wrapper = mountCalendar();
    const events = wrapper.findAll('.mini-event').map((event) => event.text());

    expect(wrapper.find('.mini-agenda').text()).toContain('Today');
    expect(events).toHaveLength(2);
    expect(events[0]).toContain('Data Intern');
    expect(events[0]).toMatch(/Interview · 2:00\s?pm · Shopee/i);
    expect(events[1]).toContain('Deadline · Acme');
  });

  it('shows the clicked day, or "nothing on" when it is empty', async () => {
    const wrapper = mountCalendar();

    await day(wrapper, '10 November').trigger('click');
    expect(wrapper.find('.mini-agenda').text()).toContain('Tue, 10 Nov');
    expect(wrapper.findAll('.mini-event')).toHaveLength(1);

    await day(wrapper, '4 November').trigger('click');
    expect(wrapper.find('.mini-agenda').text()).toContain('nothing on');
  });

  it('moves between months, and Today jumps back', async () => {
    const wrapper = mountCalendar();

    await button(wrapper, 'Next month').trigger('click');
    expect(wrapper.find('h2').text()).toBe('December 2026');

    await button(wrapper, 'Previous month').trigger('click');
    await button(wrapper, 'Previous month').trigger('click');
    expect(wrapper.find('h2').text()).toBe('October 2026');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Today')
      .trigger('click');
    expect(wrapper.find('h2').text()).toBe('November 2026');
    expect(day(wrapper, '3 November').attributes('aria-pressed')).toBe('true');
  });

  it('clicking a greyed-out day from another month switches to that month', async () => {
    const wrapper = mountCalendar();

    await day(wrapper, '26 October').trigger('click');

    expect(wrapper.find('h2').text()).toBe('October 2026');
    expect(day(wrapper, '26 October').attributes('aria-pressed')).toBe('true');
  });
});
