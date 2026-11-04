import { describe, expect, it } from 'vitest';
import { describeNotification } from '@/utils/notification';

describe('describeNotification', () => {
  it('says which role the lead gave me', () => {
    const text = describeNotification({ type: 'role-assigned', actorName: 'Alicia', teamName: 'Pixel Pushers', role: 'Designer' });

    expect(text).toMatchObject({ text: 'Alicia made you Designer in Pixel Pushers', to: { path: '/teams', query: { tab: 'mine' } } });
  });

  it('names the role in request notifications', () => {
    expect(describeNotification({ type: 'request-received', actorName: 'Kai', teamName: 'Byte Me', role: 'Designer' }).text).toBe('Kai asked to join Byte Me as Designer');
    expect(describeNotification({ type: 'request-accepted', actorName: 'Ivus', teamName: 'Byte Me', role: 'Designer' }).text).toBe("You're in! Ivus accepted you into Byte Me as Designer");
    expect(describeNotification({ type: 'request-received', actorName: 'Kai', teamName: 'Byte Me' }).text).toBe('Kai asked to join Byte Me');
  });
});
