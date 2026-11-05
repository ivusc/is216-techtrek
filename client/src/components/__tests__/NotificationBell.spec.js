import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/services/notificationService', () => ({
  fetchNotifications: vi.fn(async () => ({ notifications: [], unreadCount: 0 })),
  markNotificationRead: vi.fn(async () => ({})),
  markAllNotificationsRead: vi.fn(async () => {}),
}));

vi.mock('@/services/trackerService', () => ({
  fetchApplicationService: vi.fn(async () => ({ _id: 'a1', status: 'applied', opportunityId: { title: 'Frontend Intern', organisation: 'Acme', type: 'internship' } })),
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

// RouterLink stub that keeps the link target and the click
const RouterLink = {
  props: ['to'],
  emits: ['click'],
  template: '<a :data-to="JSON.stringify(to)" @click="$emit(\'click\')"><slot /></a>',
};

function mountWithLinks() {
  return mount(NotificationBell, { global: { stubs: { RouterLink } } });
}

beforeEach(() => {
  setActivePinia(createPinia());
});

function mountBell() {
  const store = useNotificationStore();
  store.notifications = [{ ...REQUEST }, { ...REQUEST, _id: 'n2', type: 'member-left', read: true }];
  store.unreadCount = 1;
  return { wrapper: mountWithLinks(), store };
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
    expect(JSON.parse(wrapper.findAll('.notification-item')[0].attributes('data-to'))).toEqual({
      path: '/teams',
      query: { tab: 'requests' },
    });
  });

  it('opens a deadline reminder as a details card instead of leaving the page', async () => {
    const store = useNotificationStore();
    const deadline = new Date(Date.now() + 20 * 3600000).toISOString();
    store.notifications = [
      { _id: 'r1', type: 'deadline-reminder', applicationId: 'a1', title: 'Frontend Intern', organisation: 'Acme', deadline, daysLeft: 1, read: false, createdAt: new Date().toISOString() },
    ];
    store.unreadCount = 1;
    const wrapper = mount(NotificationBell, { global: { stubs: { RouterLink } }, attachTo: document.body });

    expect(wrapper.find('.modal').exists()).toBe(false);
    await wrapper.find('button.notification-item').trigger('click');

    expect(notificationService.markNotificationRead).toHaveBeenCalledWith('r1');
    expect(wrapper.find('.modal').text()).toContain('Frontend Intern');
    await wrapper.find('.modal .btn-close').trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(false);
    wrapper.unmount();
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
    expect(mountWithLinks().text()).toContain('Nothing yet');
  });
});
