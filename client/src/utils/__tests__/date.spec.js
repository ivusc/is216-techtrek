import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatTime, toDateTimeInputValue } from '@/utils/date';

process.env.TZ = 'Asia/Singapore';

describe('formatDate', () => {
  it('shows the day and the short month', () => {
    expect(formatDate('2026-10-24T00:00:00+08:00')).toBe('24 Oct');
  });
});

describe('formatDateTime', () => {
  it('shows the date and the local time', () => {
    expect(formatDateTime('2026-10-18T15:59:00Z')).toBe('18 Oct 2026, 11:59 pm');
  });
});

describe('formatTime', () => {
  it('shows the local time', () => {
    expect(formatTime('2026-10-14T06:00:00Z')).toBe('2:00 pm');
  });
});

describe('toDateTimeInputValue', () => {
  it.each([
    ['an empty value', '', ''],
    ['an ISO string', '2026-10-18T15:59:00Z', '2026-10-18T23:59'],
    ['a Date', new Date('2026-10-18T15:59:00Z'), '2026-10-18T23:59'],
  ])('turns %s into local input text', (label, value, text) => {
    expect(toDateTimeInputValue(value)).toBe(text);
  });

  it('leaves the Date it was given unchanged', () => {
    const date = new Date('2026-10-18T15:59:00Z');

    toDateTimeInputValue(date);

    expect(date.toISOString()).toBe('2026-10-18T15:59:00.000Z');
  });
});
