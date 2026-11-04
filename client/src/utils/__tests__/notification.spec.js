import { describe, expect, it } from 'vitest';
import { describeNotification } from '@/utils/notification';

describe('describeNotification', () => {
  it('says which role the lead gave me', () => {
    const text = describeNotification({ type: 'role-assigned', actorName: 'Alicia', teamName: 'Pixel Pushers', role: 'Designer' });

    expect(text).toMatchObject({ text: 'Alicia made you Designer in Pixel Pushers', to: { path: '/teams', query: { tab: 'mine' } } });
  });
});
