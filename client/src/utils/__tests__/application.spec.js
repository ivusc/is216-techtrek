import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApplicationDeadline, getFollowUpNudge, groupByMonth, historyOutcome, historySummary, historyTimeline, isDueThisWeek, isOverdue } from '@/utils/application';
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

describe('history helpers', () => {
  const step = (status, at) => ({ status, at });

  it('says how each one ended', () => {
    expect(historyOutcome({ status: 'offer' }).label).toBe('Offer');
    expect(historyOutcome({ status: 'rejected' }).label).toBe('Rejected');
    expect(historyOutcome({ status: 'results', result: 'won' }).label).toBe('Won');
    expect(historyOutcome({ status: 'results' }).label).toBe('Finished');
    expect(historyOutcome({ status: 'applied' }).label).toBe('Stopped at Applied');
  });

  it('lists the steps with their dates, leaving out Saved', () => {
    const application = {
      status: 'offer',
      statusHistory: [step('saved', '2026-10-01T02:00:00Z'), step('applied', '2026-10-03T02:00:00Z'), step('offer', '2026-11-12T02:00:00Z')],
    };
    expect(historyTimeline(application)).toBe('Applied 3 Oct → Offer 12 Nov');
    // older cards without a history show their last step and update
    expect(historyTimeline({ status: 'rejected', updatedAt: '2026-10-20T02:00:00Z' })).toBe('Rejected 20 Oct');
  });

  it('groups by the month they finished, newest first', () => {
    const groups = groupByMonth([
      { _id: 'a', statusHistory: [step('rejected', '2026-10-05T02:00:00Z')] },
      { _id: 'b', statusHistory: [step('offer', '2026-11-12T02:00:00Z')] },
      { _id: 'c', updatedAt: '2026-11-02T02:00:00Z' },
    ]);
    expect(groups.map((group) => [group.label, group.items.map((item) => item._id)])).toEqual([
      ['November 2026', ['b', 'c']],
      ['October 2026', ['a']],
    ]);
  });

  it('counts interviews reached, offers and events', () => {
    expect(
      historySummary([
        { status: 'offer', statusHistory: [step('interview', '2026-10-01'), step('offer', '2026-10-09')], opportunityId: { type: 'job' } },
        { status: 'rejected', statusHistory: [step('interview', '2026-10-01'), step('rejected', '2026-10-09')], opportunityId: { type: 'internship' } },
        { status: 'results', result: 'won', opportunityId: { type: 'hackathon' } },
      ]),
    ).toEqual({ total: 3, interviews: 2, offers: 1, events: 1 });
  });
});

