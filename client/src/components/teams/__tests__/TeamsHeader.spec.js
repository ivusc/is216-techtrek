import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import { useNotificationStore } from '@/store/notifications';
import TeamsHeader from '@/components/teams/TeamsHeader.vue';
import { ME } from '@/__tests__/fixtures/teams';

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME };
});

function mountHeader(props = {}) {
  const wrapper = mount(TeamsHeader, {
    props: {
      modelValue: '',
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
  return wrapper;
}

describe('TeamsHeader', () => {
  it('shows the notification bell with my unread count', () => {
    useNotificationStore().unreadCount = 3;

    const bell = mountHeader().find('[aria-label="Notifications, 3 unread"]');

    expect(bell.exists()).toBe(true);
    expect(bell.text()).toBe('3');
  });

  it('binds the search and shows my initials', async () => {
    const wrapper = mountHeader();

    await wrapper.find('[aria-label="Search teams"]').setValue('byte');

    expect(wrapper.props('modelValue')).toBe('byte');
    expect(wrapper.find('[title="Kellie Jubela"]').text()).toBe('KJ');
  });
});
