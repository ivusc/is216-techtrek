import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAvatarStyle,
  getClosesInDays,
  getDisplayName,
  getEventBadgeClass,
  getInitials,
  getMatchingSkills,
  getSchoolLine,
  getSlotsText,
  joinWithAnd,
  timeAgo,
} from '@/utils/team';
import { NOW } from '@/__tests__/fixtures/applications';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(milliseconds) {
  return new Date(Date.parse(NOW) - milliseconds).toISOString();
}

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe('getDisplayName', () => {
  it.each([
    [
      'the display name',
      { displayName: 'Kellie J', userName: 'kellie.jubela@smu.edu.sg' },
      'Kellie J',
    ],
    [
      'the email without a display name',
      { userName: 'kellie.jubela@smu.edu.sg' },
      'kellie.jubela@smu.edu.sg',
    ],
    ['Unknown without a user', null, 'Unknown'],
  ])('shows %s', (label, user, name) => {
    expect(getDisplayName(user)).toBe(name);
  });
});

describe('getInitials', () => {
  it.each([
    ['Kellie Jubela', 'KJ'],
    ['kellie.jubela@smu.edu.sg', 'KJ'],
    ['Ivus', 'IV'],
    ['', '?'],
  ])('%j gives %j', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});

describe('getAvatarStyle', () => {
  it('gives the same colours to the same name and different ones to others', () => {
    expect(getAvatarStyle('Kellie Jubela')).toBe(getAvatarStyle('Kellie Jubela'));
    expect(getAvatarStyle('a')).not.toEqual(getAvatarStyle('b'));
  });
});

describe('getSchoolLine', () => {
  it.each([
    ['year and course', { year: 2, course: 'Information Systems' }, 'Y2 Information Systems'],
    [
      'year, course and school',
      { year: 2, course: 'Information Systems', faculty: 'SCIS' },
      'Y2 Information Systems SCIS',
    ],
    ['year only', { year: 3 }, 'Y3'],
    ['course only', { course: 'Computer Science' }, 'Computer Science'],
    ['no user', null, ''],
  ])('writes %s as %j', (label, user, line) => {
    expect(getSchoolLine(user)).toBe(line);
  });
});

describe('getSlotsText', () => {
  it.each([
    [0, 'Full'],
    [1, '1 slot open'],
    [3, '3 slots open'],
  ])('reads %j open slots as %j', (slotsOpen, text) => {
    expect(getSlotsText({ slotsOpen })).toBe(text);
  });
});

describe('timeAgo', () => {
  it.each([
    ['30 seconds', 30 * 1000, 'just now'],
    ['5 minutes', 5 * MINUTE, '5m ago'],
    ['3 hours', 3 * HOUR, '3h ago'],
    ['1 day', DAY, 'Yesterday'],
    ['4 days', 4 * DAY, '4 days ago'],
  ])('reads %s ago as %j', (label, milliseconds, text) => {
    expect(timeAgo(ago(milliseconds))).toBe(text);
  });
});

describe('getMatchingSkills', () => {
  it('matches case-insensitively and keeps my casing', () => {
    expect(getMatchingSkills(['vue.js', 'Figma', 'SQL'], ['Vue.js', 'figma', 'Go'])).toEqual([
      'vue.js',
      'Figma',
    ]);
  });
});

describe('joinWithAnd', () => {
  it.each([
    [[], ''],
    [['Vue'], 'Vue'],
    [['Vue', 'Figma'], 'Vue and Figma'],
    [['Vue', 'Figma', 'SQL'], 'Vue, Figma and SQL'],
  ])('joins %j as %j', (items, text) => {
    expect(joinWithAnd(items)).toBe(text);
  });
});

describe('getClosesInDays', () => {
  it.each([
    ['no close date', {}, null],
    ['a close date in two days', { closesAt: ago(-2 * DAY) }, 2],
    ['a close date yesterday', { closesAt: ago(DAY) }, -1],
  ])('counts %s as %j', (label, team, days) => {
    expect(getClosesInDays(team)).toBe(days);
  });
});

describe('getEventBadgeClass', () => {
  it('gives the same badge to the same event and uses both badges', () => {
    expect(getEventBadgeClass('Hack&Roll')).toBe(getEventBadgeClass('Hack&Roll'));
    expect(new Set([getEventBadgeClass('a'), getEventBadgeClass('b')])).toEqual(
      new Set(['bg-info-subtle text-primary-emphasis', 'bg-tt-peach text-body']),
    );
  });
});
