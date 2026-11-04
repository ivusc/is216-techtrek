import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useNotificationStore } from '@/store/notifications';

const mock = new MockAdapter(serverAPI);

const UNREAD = { _id: 'n1', type: 'member-joined', read: false };
const READ = { _id: 'n2', type: 'member-left', read: true };

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock
    .onGet('/notifications')
    .reply(200, { notifications: [{ ...UNREAD }, { ...READ }], unreadCount: 1 });
  mock.onPatch(/\/notifications\/.*read/).reply(200, {});
});

afterEach(() => {
  useNotificationStore().stop();
  mock.reset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const getCount = () => mock.history.get.filter((call) => call.url === '/notifications').length;

describe('useNotificationStore', () => {
  it('refresh loads notifications and the unread count', async () => {
    const store = useNotificationStore();

    await store.refresh();

    expect(store.notifications).toHaveLength(2);
    expect(store.unreadCount).toBe(1);
    expect(store.isLoading).toBe(false);
  });

  it('refresh keeps the old list when the request fails', async () => {
    const store = useNotificationStore();
    await store.refresh();
    mock.onGet('/notifications').reply(500);

    await store.refresh();

    expect(store.notifications).toHaveLength(2);
    expect(store.isLoading).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('markRead marks one notification read and patches the server', async () => {
    const store = useNotificationStore();
    await store.refresh();
    const [first] = store.notifications;

    await store.markRead(first);

    expect(first.read).toBe(true);
    expect(store.unreadCount).toBe(0);
    expect(mock.history.patch.map((call) => call.url)).toEqual(['/notifications/n1/read']);
  });

  it('markRead does nothing for a notification that is already read', async () => {
    const store = useNotificationStore();
    await store.refresh();

    await store.markRead(store.notifications[1]);

    expect(store.unreadCount).toBe(1);
    expect(mock.history.patch).toHaveLength(0);
  });

  it('markRead never takes the unread count below zero', async () => {
    const store = useNotificationStore();
    store.unreadCount = 0;

    await store.markRead({ ...UNREAD });

    expect(store.unreadCount).toBe(0);
  });

  it('markRead keeps the local change when the server call fails', async () => {
    const store = useNotificationStore();
    await store.refresh();
    mock.resetHandlers();
    mock.onPatch('/notifications/n1/read').reply(500);

    await store.markRead(store.notifications[0]);

    expect(store.notifications[0].read).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('markAllRead marks everything read and zeroes the count', async () => {
    const store = useNotificationStore();
    await store.refresh();

    await store.markAllRead();

    expect(store.notifications.every((n) => n.read)).toBe(true);
    expect(store.unreadCount).toBe(0);
    expect(mock.history.patch.map((call) => call.url)).toEqual(['/notifications/read']);
  });

  it('start refreshes now and every 30 seconds, and only sets one timer', async () => {
    vi.useFakeTimers();
    const store = useNotificationStore();

    store.start();
    store.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(getCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(getCount()).toBe(2);
  });

  it('refreshes when the tab becomes visible again, but not when hidden', async () => {
    const store = useNotificationStore();
    store.start();
    await vi.waitFor(() => expect(getCount()).toBe(1));

    setVisibility('hidden');
    setVisibility('visible');

    await vi.waitFor(() => expect(getCount()).toBe(2));
  });

  it('stop clears the timer, the listener and the state', async () => {
    vi.useFakeTimers();
    const store = useNotificationStore();
    store.start();
    await vi.advanceTimersByTimeAsync(0);

    store.stop();
    await vi.advanceTimersByTimeAsync(60000);
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(0);

    expect(getCount()).toBe(1);
    expect(store.notifications).toEqual([]);
    expect(store.unreadCount).toBe(0);
  });
});
