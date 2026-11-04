import { afterEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import * as trackerService from '@/services/trackerService';

const mock = new MockAdapter(serverAPI);

afterEach(() => mock.reset());

const OPPORTUNITY = {
  source: 'manual',
  type: 'job',
  title: 'Frontend Intern',
  organisation: 'Acme',
};
const DETAILS = { status: 'applied', deadline: '2026-11-10', notes: 'Referred by Sam.' };

const calls = [
  ['fetchAllApplications', () => trackerService.fetchAllApplications(), 'get', '/application'],
  [
    'createApplicationService',
    () => trackerService.createApplicationService(OPPORTUNITY),
    'post',
    '/application',
    { opportunity: OPPORTUNITY, status: 'saved', notes: 'Saved via techtrek.' },
  ],
  [
    'addApplicationService',
    () => trackerService.addApplicationService(OPPORTUNITY, DETAILS),
    'post',
    '/application',
    { opportunity: OPPORTUNITY, ...DETAILS },
  ],
  [
    'updateApplicationService',
    () => trackerService.updateApplicationService('a1', { status: 'interview' }),
    'patch',
    '/application/a1',
    { status: 'interview' },
  ],
  [
    'deleteApplicationService',
    () => trackerService.deleteApplicationService('a1'),
    'delete',
    '/application/a1',
  ],
];

describe('trackerService', () => {
  it.each(calls)(
    '%s sends only what the server needs and returns its answer',
    async (name, call, method, url, body) => {
      mock.onAny().reply(200, { _id: 'a1' });

      await expect(call()).resolves.toEqual({ _id: 'a1' });

      const [config] = mock.history[method];
      expect(config.url).toBe(url);
      expect(config.params).toBeUndefined();
      expect(config.data === undefined ? undefined : JSON.parse(config.data)).toEqual(body);
    },
  );
});
