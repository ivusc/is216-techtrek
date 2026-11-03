import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import serverAPI from '@/services/serverAPI';
import UserAvatar from '@/components/UserAvatar.vue';

describe('UserAvatar', () => {
  it('shows the photo with a versioned URL when the user has one', () => {
    const wrapper = mount(UserAvatar, {
      props: { userId: 'u1', name: 'Kellie Jubela', avatarUpdatedAt: '2026-11-03T10:00:00.000Z' },
    });

    expect(wrapper.find('img').attributes('src')).toBe(
      `${serverAPI.defaults.baseURL}/users/u1/avatar?v=2026-11-03T10%3A00%3A00.000Z`,
    );
  });

  it('shows initials when there is no photo', () => {
    const wrapper = mount(UserAvatar, { props: { userId: 'u1', name: 'Kellie Jubela' } });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe('KJ');
  });

  it('falls back to initials when the photo fails to load', async () => {
    const wrapper = mount(UserAvatar, {
      props: { userId: 'u1', name: 'Kellie Jubela', avatarUpdatedAt: '2026-11-03T10:00:00.000Z' },
    });

    await wrapper.find('img').trigger('error');

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe('KJ');
  });
});
