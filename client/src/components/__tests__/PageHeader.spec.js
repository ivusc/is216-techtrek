import { beforeEach, describe, expect, it } from 'vitest';
import { RouterLinkStub, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import PageHeader from '@/components/PageHeader.vue';

function mountHeader(props = {}) {
  return mount(PageHeader, { props, global: { stubs: { RouterLink: RouterLinkStub } } });
}

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = {
    _id: 'u1',
    userName: 'kellie.jubela@smu.edu.sg',
    displayName: 'Kellie Jubela',
  };
});

describe('PageHeader', () => {
  it('names the search after the type and binds the model', async () => {
    const wrapper = mountHeader({ type: 'applications', modelValue: 'intern' });
    const input = wrapper.find('input');

    expect(input.attributes('placeholder')).toBe('Search applications...');
    expect(input.attributes('aria-label')).toBe('Search applications');
    expect(input.element.value).toBe('intern');

    await input.setValue('vue');
    expect(wrapper.emitted('update:modelValue')).toEqual([['vue']]);
  });

  it('hides the search when asked', () => {
    const wrapper = mountHeader({ showSearch: false });

    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('links the avatar to the profile', () => {
    const link = mountHeader().findComponent(RouterLinkStub);

    expect(link.props('to')).toBe('/profile');
    expect(link.attributes('aria-label')).toBe('Your profile');
    expect(link.text()).toBe('KJ');
  });
});
