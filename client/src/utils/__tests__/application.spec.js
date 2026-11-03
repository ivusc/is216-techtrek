import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApplicationDeadline, isDueThisWeek, isOverdue } from '@/utils/application';
import { NOW } from '@/__tests__/fixtures/applications';

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days) {
  return new Date(Date.parse(NOW) + days * DAY).toISOString();
}

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe('getApplicationDeadline', () => {
  it('prefers the deadline set on the application', () => {
    const application = {
      deadline: '2026-11-06T15:59:00.000Z',
      opportunityId: { deadline: '2026-11-30T23:59:59.000Z' },
    };

    expect(getApplicationDeadline(application)).toBe('2026-11-06T15:59:00.000Z');
  });

  it("falls back to the opportunity's deadline", () => {
    const application = { opportunityId: { deadline: '2026-11-30T23:59:59.000Z' } };

    expect(getApplicationDeadline(application)).toBe('2026-11-30T23:59:59.000Z');
  });

  it('is null when neither has one', () => {
    expect(getApplicationDeadline({ opportunityId: {} })).toBeNull();
  });

  it('is null when the opportunity is gone', () => {
    expect(getApplicationDeadline({ _id: 'a1', opportunityId: null })).toBeNull();
  });
});

describe('isDueThisWeek and isOverdue', () => {
  it.each([
    [0, true, false],
    [7, true, false],
    [8, false, false],
    [-1, false, true],
    [null, false, false],
  ])('with %j days left: due this week %j, overdue %j', (days, due, overdue) => {
    const application = {
      deadline: days === null ? undefined : daysFromNow(days),
      opportunityId: {},
    };

    expect(isDueThisWeek(application)).toBe(due);
    expect(isOverdue(application)).toBe(overdue);
  });
});
