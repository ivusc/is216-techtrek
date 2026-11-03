import { afterEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import * as teamService from '@/services/teamService';

const mock = new MockAdapter(serverAPI);

afterEach(() => mock.reset());

const calls = [
  ['fetchTeams', () => teamService.fetchTeams(), 'get', '/teams'],
  ['fetchMyTeams', () => teamService.fetchMyTeams(), 'get', '/teams/mine'],
  [
    'createTeam',
    () => teamService.createTeam({ name: 'Byte Me' }),
    'post',
    '/teams',
    { name: 'Byte Me' },
  ],
  [
    'updateTeam',
    () => teamService.updateTeam('t1', { name: 'Byte Me' }),
    'patch',
    '/teams/t1',
    { name: 'Byte Me' },
  ],
  ['deleteTeam', () => teamService.deleteTeam('t1'), 'delete', '/teams/t1'],
  [
    'sendRequest',
    () => teamService.sendRequest('t1', { role: 'Designer' }),
    'post',
    '/teams/t1/requests',
    { role: 'Designer' },
  ],
  [
    'fetchIncomingRequests',
    () => teamService.fetchIncomingRequests(),
    'get',
    '/teams/requests/incoming',
  ],
  ['fetchSentRequests', () => teamService.fetchSentRequests(), 'get', '/teams/requests/sent'],
  [
    'answerRequest',
    () => teamService.answerRequest('r1', 'accepted'),
    'patch',
    '/teams/requests/r1',
    { status: 'accepted' },
  ],
  ['withdrawRequest', () => teamService.withdrawRequest('r1'), 'delete', '/teams/requests/r1'],
];

describe('teamService', () => {
  it.each(calls)('%s sends only what the server needs', async (name, call, method, url, body) => {
    mock.onAny().reply(200, {});

    await call();

    const [config] = mock.history[method];
    expect(config.url).toBe(url);
    expect(config.params).toBeUndefined();
    expect(config.data === undefined ? undefined : JSON.parse(config.data)).toEqual(body);
  });

  it('no longer has its own profile calls', () => {
    expect(teamService).not.toHaveProperty('fetchProfile');
    expect(teamService).not.toHaveProperty('updateSkills');
  });
});
