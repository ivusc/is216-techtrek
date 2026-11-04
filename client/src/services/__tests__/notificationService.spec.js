import { afterEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import * as notificationService from '@/services/notificationService';

const mock = new MockAdapter(serverAPI);

afterEach(() => mock.reset());

describe('notificationService', () => {
  it('fetchNotifications gets /notifications and returns the body', async () => {
    const body = { notifications: [{ _id: 'n1' }], unreadCount: 1 };
    mock.onGet('/notifications').reply(200, body);

    await expect(notificationService.fetchNotifications()).resolves.toEqual(body);
  });

  it('markNotificationRead patches /notifications/:id/read', async () => {
    mock.onPatch('/notifications/n1/read').reply(200, { _id: 'n1', read: true });

    await expect(notificationService.markNotificationRead('n1')).resolves.toEqual({
      _id: 'n1',
      read: true,
    });
  });

  it('markAllNotificationsRead patches /notifications/read', async () => {
    mock.onPatch('/notifications/read').reply(204);

    await notificationService.markAllNotificationsRead();

    expect(mock.history.patch.map((call) => call.url)).toEqual(['/notifications/read']);
  });
});
