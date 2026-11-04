import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/notificationService', () => ({
  fetchNotifications: vi.fn(async () => ({ notifications: [], unreadCount: 0 })),
  markNotificationRead: vi.fn(async () => ({})),
  markAllNotificationsRead: vi.fn(async () => {}),
}));

import { useNotificationStore } from '@/store/notifications';
import * as notificationService from '@/services/notificationService';
import NotificationBell from '@/components/NotificationBell.vue';

const REQUEST = {
  _id: 'n1',
  type: 'request-received',
  actorName: 'Avery Tan',
  teamName: 'Pixel Pandas',
  read: false,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  setActivePinia(createPinia());
  push.mockClear();
});

function mountBell() {
  const store = useNotificationStore();
  store.notifications = [{ ...REQUEST }, { ...REQUEST, _id: 'n2', type: 'member-left', read: true }];
  store.unreadCount = 1;
  return { wrapper: mount(NotificationBell), store };
}

describe('NotificationBell', () => {
  it('shows the unread count and a line for each notification', () => {
    const { wrapper } = mountBell();

    expect(wrapper.find('.bell-badge').text()).toBe('1');
    const items = wrapper.findAll('.notification-item');
    expect(items[0].text()).toContain('Avery Tan asked to join Pixel Pandas');
    expect(items[1].text()).toContain('Avery Tan left Pixel Pandas');
  });

  it('marks a notification read and goes to the right tab when clicked', async () => {
    const { wrapper, store } = mountBell();

    await wrapper.findAll('.notification-item')[0].trigger('click');

    expect(notificationService.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(store.unreadCount).toBe(0);
    expect(push).toHaveBeenCalledWith({ path: '/teams', query: { tab: 'requests' } });
  });

  it('marks everything read', async () => {
    const { wrapper, store } = mountBell();

    await wrapper.find('.dropdown-menu .btn-link').trigger('click');

    expect(notificationService.markAllNotificationsRead).toHaveBeenCalled();
    expect(store.unreadCount).toBe(0);
    expect(wrapper.find('.bell-badge').exists()).toBe(false);
  });

  it('says so when there is nothing yet', () => {
    useNotificationStore().notifications = [];
    expect(mount(NotificationBell).text()).toContain('Nothing yet');
  });
});
