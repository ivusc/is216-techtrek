import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDaysLeft,
  getJobType,
  getKey,
  getLocationGroup,
  getMonthlySalary,
  getPlatform,
  getPostedText,
  getPrizeAmount,
  getPrizeText,
  getUrgentText,
  isClosed,
  isPaid,
} from '@/utils/opportunity';
import { NOW } from '@/__tests__/fixtures/applications';

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days) {
  return new Date(Date.parse(NOW) + days * DAY).toISOString();
}

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe('getKey', () => {
  it('joins the source and the external id', () => {
    expect(getKey({ source: 'adzuna', externalId: '42' })).toBe('adzuna-42');
  });
});

describe('getDaysLeft', () => {
  it.each([
    ['two days ahead', daysFromNow(2), 2],
    ['a day ago', daysFromNow(-1), -1],
    ['no deadline', undefined, null],
  ])('counts %s as %j', (label, deadline, days) => {
    expect(getDaysLeft({ deadline })).toBe(days);
  });
});

describe('getLocationGroup', () => {
  it.each([
    ['Singapore, SG', 'Singapore'],
    ['Remote', 'Online'],
    ['ONLINE', 'Online'],
    ['Jakarta', 'Other'],
    [undefined, 'Other'],
  ])('puts %j under %j', (location, group) => {
    expect(getLocationGroup({ location })).toBe(group);
  });
});

describe('getMonthlySalary', () => {
  it.each([
    [36000, 3000],
    [undefined, 0],
  ])('turns a yearly %j into %j a month', (minSalary, monthly) => {
    expect(getMonthlySalary({ minSalary })).toBe(monthly);
  });
});

describe('getPrizeAmount', () => {
  it.each([
    ['$10,000 in prizes', 10000],
    ['1st: $500', 500],
    ['21st place: $300', 300],
    ['$5k', 5],
    ['SGD500', 500],
    ['€2,500', 2500],
    ['Swag', 0],
    [undefined, 0],
  ])('%j is worth %j', (prize, amount) => {
    expect(getPrizeAmount({ prize })).toBe(amount);
  });
});

describe('getPrizeText', () => {
  it.each([
    ['$10,000 in prizes', '$10,000 in prizes'],
    ['Over $1,000 in Prizes', 'Over $1,000 in Prizes'],
    ['$5,000 Prize pool', '$5,000 Prize pool'],
    ['$500 grand prize', '$500 grand prize'],
    ['$5,000', '$5,000 prizes'],
    ['Enterprize Cup: $300', 'Enterprize Cup: $300 prizes'],
  ])('%j reads %j', (prize, text) => {
    expect(getPrizeText({ prize })).toBe(text);
  });
});

describe('isPaid', () => {
  it.each([
    ['a hackathon with a prize', { type: 'hackathon', prize: '$500 in prizes' }, true],
    ['a hackathon without a prize', { type: 'hackathon', prize: '' }, false],
    [
      'a job with a predicted salary',
      { type: 'job', minSalary: 48000, salaryIsPredicted: true },
      false,
    ],
    [
      'a job with a listed salary',
      { type: 'job', minSalary: 48000, salaryIsPredicted: false },
      true,
    ],
  ])('counts %s as paid: %j', (label, item, paid) => {
    expect(isPaid(item)).toBe(paid);
  });
});

describe('isClosed', () => {
  it.each([
    ['a past deadline', daysFromNow(-1), true],
    ['a future deadline', daysFromNow(1), false],
    ['no deadline', undefined, false],
  ])('treats %s as closed: %j', (label, deadline, closed) => {
    expect(isClosed({ deadline })).toBe(closed);
  });
});

describe('getUrgentText', () => {
  it.each([
    [-1, 'Closed'],
    [0, 'Closes today'],
    [1, '1 day left'],
    [5, '5 days left'],
    [8, ''],
    [null, ''],
  ])('reads %j days left as %j', (days, text) => {
    expect(getUrgentText({ deadline: days === null ? undefined : daysFromNow(days) })).toBe(text);
  });
});

describe('getPostedText', () => {
  it.each([
    [0, 'Posted today'],
    [1, 'Posted 1 day ago'],
    [3, 'Posted 3 days ago'],
    [null, ''],
  ])('reads a job posted %j days ago as %j', (days, text) => {
    expect(getPostedText({ postedAt: days === null ? undefined : daysFromNow(-days) })).toBe(text);
  });
});

describe('getPlatform', () => {
  it.each([
    ['adzuna', 'Adzuna'],
    ['devpost', 'Devpost'],
  ])('names %j as %j', (source, platform) => {
    expect(getPlatform({ source })).toBe(platform);
  });
});

describe('getJobType', () => {
  it.each([
    [
      'time and type',
      { contractTime: 'full_time', contractType: 'permanent' },
      'Full time · Permanent',
    ],
    ['time only', { contractTime: 'part_time' }, 'Part time'],
    ['type only', { contractType: 'contract' }, 'Contract'],
    ['neither', {}, ''],
  ])('describes %s as %j', (label, item, text) => {
    expect(getJobType(item)).toBe(text);
  });
});
