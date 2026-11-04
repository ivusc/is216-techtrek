import { afterEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import * as userService from '@/services/userService';

const mock = new MockAdapter(serverAPI);

afterEach(() => mock.reset());

const USER = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg', displayName: 'Kellie Jubela' };
const ANSWER = { isAuthenticated: true, user: USER };
const LOGIN = { userName: 'kellie.jubela@smu.edu.sg', password: 'Password1!' };

const calls = [
  ['fetchMe', () => userService.fetchMe(), 'get', '/me', undefined, { timeout: 10000 }, ANSWER],
  [
    'login',
    () => userService.login(LOGIN.userName, LOGIN.password),
    'post',
    '/login',
    LOGIN,
    { skipAuthRedirect: true },
    USER,
  ],
  [
    'register',
    () => userService.register(LOGIN.userName, LOGIN.password),
    'post',
    '/register',
    LOGIN,
    { skipAuthRedirect: undefined },
    USER,
  ],
  ['logout', () => userService.logout(), 'post', '/logout', undefined, {}, undefined],
  [
    'updateMe',
    () => userService.updateMe({ displayName: 'Kellie J' }),
    'patch',
    '/me',
    { displayName: 'Kellie J' },
    {},
    USER,
  ],
  [
    'changePassword',
    () => userService.changePassword('Password1!', 'Password2!'),
    'patch',
    '/me/password',
    { currentPassword: 'Password1!', newPassword: 'Password2!' },
    {},
    undefined,
  ],
  [
    'deleteMe',
    () => userService.deleteMe('Password1!'),
    'delete',
    '/me',
    { password: 'Password1!' },
    {},
    undefined,
  ],
  ['removeAvatar', () => userService.removeAvatar(), 'delete', '/me/avatar', undefined, {}, USER],
];

describe('userService', () => {
  it.each(calls)(
    '%s sends the request the server expects',
    async (name, call, method, url, body, options, returned) => {
      mock.onAny().reply(200, ANSWER);

      await expect(call()).resolves.toEqual(returned);

      const [config] = mock.history[method];
      expect(config.url).toBe(url);
      expect(config.data === undefined ? undefined : JSON.parse(config.data)).toEqual(body);
      for (const [key, value] of Object.entries(options)) {
        expect(config[key]).toBe(value);
      }
    },
  );

  it('uploadAvatar puts the image bytes with their type', async () => {
    mock.onPut('/me/avatar').reply(200, { user: USER });
    const photo = new Blob(['jpeg bytes'], { type: 'image/jpeg' });

    await expect(userService.uploadAvatar(photo)).resolves.toEqual(USER);

    const [config] = mock.history.put;
    expect(config.data).toBe(photo);
    expect(config.headers['Content-Type']).toBe('image/jpeg');
  });
});
