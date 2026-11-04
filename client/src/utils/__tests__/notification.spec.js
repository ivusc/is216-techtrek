import { describe, expect, it } from 'vitest';
import { describeNotification } from '@/utils/notification';

const BASE = { actorName: 'Kellie', teamName: 'Byte Me' };

describe('describeNotification', () => {
  it.each([
    ['request-received', 'Kellie asked to join Byte Me', 'requests'],
    ['request-accepted', "You're in! Kellie accepted you into Byte Me", 'mine'],
    ['request-declined', "Byte Me can't take you this time", 'browse'],
    ['invite-received', 'Kellie invited you to join Byte Me', 'browse'],
    ['invite-accepted', 'Kellie accepted your invite to Byte Me', 'mine'],
    ['invite-declined', 'Kellie declined your invite to Byte Me', 'mine'],
    ['member-joined', 'Kellie joined Byte Me', 'mine'],
    ['member-left', 'Kellie left Byte Me', 'mine'],
    ['team-deleted', 'Byte Me was deleted by its team lead', 'browse'],
  ])('%s reads well and opens the %s tab', (type, text, tab) => {
    const result = describeNotification({ ...BASE, type });

    expect(result.text).toBe(text);
    expect(result.to).toEqual({ path: '/teams', query: { tab } });
    expect(result.icon).toMatch(/^bi-/);
  });

  it('falls back when the person or team name is missing', () => {
    expect(describeNotification({ type: 'member-joined' }).text).toBe('Someone joined your team');
  });

  it('has a generic message for unknown types', () => {
    expect(describeNotification({ ...BASE, type: 'something-new' })).toEqual({
      text: 'Something happened in one of your teams',
      icon: 'bi-bell',
      tone: 'muted',
      to: { path: '/teams' },
    });
  });

  it('says which role the lead gave me', () => {
    const text = describeNotification({ type: 'role-assigned', actorName: 'Alicia', teamName: 'Pixel Pushers', role: 'Designer' });

    expect(text).toMatchObject({ text: 'Alicia made you Designer in Pixel Pushers', to: { path: '/teams', query: { tab: 'mine' } } });
  });

  it('names the role in request notifications', () => {
    expect(describeNotification({ type: 'request-received', actorName: 'Kai', teamName: 'Byte Me', role: 'Designer' }).text).toBe('Kai asked to join Byte Me as Designer');
    expect(describeNotification({ type: 'request-accepted', actorName: 'Ivus', teamName: 'Byte Me', role: 'Designer' }).text).toBe("You're in! Ivus accepted you into Byte Me as Designer");
    expect(describeNotification({ type: 'request-received', actorName: 'Kai', teamName: 'Byte Me' }).text).toBe('Kai asked to join Byte Me');
  });

  it('explains why a request or invite was closed', () => {
    const text = (type, about) => describeNotification({ type, teamName: 'Byte Me', about }).text;

    expect(text('team-full', 'request')).toBe('Byte Me filled up, so your request was closed');
    expect(text('team-full', 'invite')).toBe('Byte Me filled up before you answered the invite');
    expect(text('team-closed', 'request')).toBe('Byte Me stopped taking new members, so your request was closed');
  });

  it('names the role in invite notifications', () => {
    expect(describeNotification({ type: 'invite-received', actorName: 'Ivus', teamName: 'Byte Me', role: 'Designer' }).text).toBe('Ivus invited you to join Byte Me as Designer');
    expect(describeNotification({ type: 'invite-accepted', actorName: 'Kai', teamName: 'Byte Me', role: 'Designer' }).text).toBe('Kai accepted your invite to Byte Me as Designer');
  });
});
