import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApplicationDeadline, getFollowUpNudge, isDueThisWeek, isOverdue } from '@/utils/application';
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

describe('getFollowUpNudge', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  const applied = (fields) => ({ status: 'applied', updatedAt: '2026-11-19T00:00:00Z', ...fields });

  it('nudges an Applied card after 14 days with no update', () => {
    expect(getFollowUpNudge(applied({ appliedAt: '2026-11-04T09:00:00Z' }), now)).toEqual({ days: 16, followedUp: false });
    expect(getFollowUpNudge(applied({ appliedAt: '2026-11-08T09:00:00Z' }), now)).toBeNull();
  });

  it('waits another 14 days after "Followed up"', () => {
    expect(getFollowUpNudge(applied({ appliedAt: '2026-10-01T00:00:00Z', followedUpAt: '2026-11-15T00:00:00Z' }), now)).toBeNull();
    expect(getFollowUpNudge(applied({ appliedAt: '2026-10-01T00:00:00Z', followedUpAt: '2026-11-01T00:00:00Z' }), now)).toEqual({ days: 19, followedUp: true });
  });

  it('only nudges Applied cards, and falls back to the last update for older cards', () => {
    expect(getFollowUpNudge({ status: 'interview', appliedAt: '2026-10-01T00:00:00Z' }, now)).toBeNull();
    expect(getFollowUpNudge({ status: 'applied', updatedAt: '2026-10-30T00:00:00Z' }, now)).toEqual({ days: 21, followedUp: false });
  });
});

