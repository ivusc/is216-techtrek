import { describe, expect, it } from 'vitest';
import { getApplicationDeadline } from '@/utils/application';

describe('getApplicationDeadline', () => {
  it('is null when the opportunity is gone', () => {
    expect(getApplicationDeadline({ _id: 'a1', opportunityId: null })).toBeNull();
  });
});
