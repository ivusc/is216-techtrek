import { describe, expect, it } from 'vitest';
import { buildIcsFile, getEventsFor } from '@/utils/calendar';

describe('getEventsFor', () => {
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

describe('buildIcsFile', () => {
  it('leaves the description empty when the organisation is missing', () => {
    const application = {
      _id: 'a1',
      deadline: '2026-11-06T15:59:00.000Z',
      opportunityId: { type: 'job', title: 'Frontend Intern' },
    };

    expect(buildIcsFile([application]).split('\r\n')).toContain('DESCRIPTION:');
  });
});
