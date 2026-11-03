import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildIcsFile,
  getEventsFor,
  getMonthGridDates,
  groupEventsByDay,
  toDayKey,
} from '@/utils/calendar';
import { NOW } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe('toDayKey', () => {
  it('uses the local day', () => {
    expect(toDayKey('2026-10-24T16:30:00Z')).toBe('2026-10-25');
  });
});

describe('getEventsFor', () => {
  const internship = { type: 'internship', title: 'Frontend Intern', organisation: 'Acme' };

  it('gives an internship deadline the job colour', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      opportunityId: internship,
    };

    expect(getEventsFor(application)).toEqual([
      {
        application,
        date: '2026-11-06T15:59:00.000Z',
        kind: 'job',
        shortLabel: 'Frontend Intern',
        detail: 'Deadline',
      },
    ]);
  });

  it('adds the interview as a second event', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      interviewAt: '2026-11-04T06:00:00.000Z',
      opportunityId: internship,
    };

    expect(getEventsFor(application)[1]).toEqual({
      application,
      date: '2026-11-04T06:00:00.000Z',
      kind: 'interview',
      shortLabel: 'Acme interview',
      detail: 'Interview',
    });
  });

  it("keeps a hackathon's kind and reads the opportunity's deadline", () => {
    const application = {
      _id: 'a2',
      opportunityId: {
        type: 'hackathon',
        title: 'Hack&Roll',
        deadline: '2026-11-20T23:59:59.000Z',
      },
    };

    expect(getEventsFor(application)).toMatchObject([
      { kind: 'hackathon', date: '2026-11-20T23:59:59.000Z' },
    ]);
  });

  it('has no events without a deadline or an interview', () => {
    expect(getEventsFor({ _id: 'a3', opportunityId: internship })).toEqual([]);
  });

  it('has no events once the opportunity is gone', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      interviewAt: '2026-11-04T06:00:00.000Z',
      opportunityId: null,
    };

    expect(getEventsFor(application)).toEqual([]);
  });
});

describe('groupEventsByDay', () => {
  it('groups events by local day, earliest first within a day', () => {
    const job = { type: 'job', title: 'Data Analyst', organisation: 'Grab' };
    const applications = [
      { _id: 'a1', deadline: '2026-11-04T10:00:00.000Z', opportunityId: job },
      { _id: 'a2', interviewAt: '2026-11-04T01:00:00.000Z', opportunityId: job },
      { _id: 'a3', deadline: '2026-11-04T17:00:00.000Z', opportunityId: job },
    ];

    const groups = groupEventsByDay(applications);

    expect(Object.keys(groups).sort()).toEqual(['2026-11-04', '2026-11-05']);
    expect(groups['2026-11-04'].map((event) => event.date)).toEqual([
      '2026-11-04T01:00:00.000Z',
      '2026-11-04T10:00:00.000Z',
    ]);
    expect(groups['2026-11-05'].map((event) => event.application._id)).toEqual(['a3']);
  });
});

describe('getMonthGridDates', () => {
  it('fills six Monday-first weeks for November 2026', () => {
    const dates = getMonthGridDates(2026, 10);

    expect(dates).toHaveLength(42);
    expect(toDayKey(dates[0])).toBe('2026-10-26');
    expect(dates[0].getDay()).toBe(1);
    expect(toDayKey(dates.at(-1))).toBe('2026-12-06');
    expect(dates.at(-1).getDay()).toBe(0);
  });

  it('needs only four weeks for February 2027', () => {
    const dates = getMonthGridDates(2027, 1);

    expect(dates).toHaveLength(28);
    expect(toDayKey(dates[0])).toBe('2027-02-01');
    expect(toDayKey(dates.at(-1))).toBe('2027-02-28');
  });
});

describe('buildIcsFile', () => {
  it('writes one event per deadline and interview', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      interviewAt: '2026-11-04T06:00:00.000Z',
      opportunityId: { type: 'job', title: 'Title, with comma', organisation: 'Acme; Pte' },
    };

    expect(buildIcsFile([application])).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TechTrek//Tracker//EN',
        'BEGIN:VEVENT',
        'UID:a1-deadline@techtrek',
        'DTSTAMP:20261103T000000Z',
        'DTSTART:20261106T155900Z',
        'DTEND:20261106T162900Z',
        'SUMMARY:Deadline: Title\\, with comma',
        'DESCRIPTION:Acme\\; Pte',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:a1-interview@techtrek',
        'DTSTAMP:20261103T000000Z',
        'DTSTART:20261104T060000Z',
        'DTEND:20261104T063000Z',
        'SUMMARY:Interview: Title\\, with comma',
        'DESCRIPTION:Acme\\; Pte',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    );
  });

  it('leaves the description empty when the organisation is missing', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      opportunityId: { type: 'job', title: 'Frontend Intern' },
    };

    expect(buildIcsFile([application]).split('\r\n')).toContain('DESCRIPTION:');
  });

  it('is an empty calendar without applications', () => {
    expect(buildIcsFile([]).split('\r\n')).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TechTrek//Tracker//EN',
      'END:VCALENDAR',
    ]);
  });
});
