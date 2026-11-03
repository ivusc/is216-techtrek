import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
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
  it('shows the dot only when there are new requests', () => {
    expect(mountHeader().find('[aria-label="Requests"] .rounded-circle').exists()).toBe(false);
    expect(
      mountHeader({ hasNewRequests: true })
        .find('[aria-label="Requests"] .rounded-circle')
        .exists(),
    ).toBe(true);
  });

  it('emits bell', async () => {
    const wrapper = mountHeader();

    await wrapper.find('[aria-label="Requests"]').trigger('click');

    expect(wrapper.emitted('bell')).toHaveLength(1);
  });

  it('binds the search and shows my initials', async () => {
    const wrapper = mountHeader();

    await wrapper.find('[aria-label="Search teams"]').setValue('byte');

    expect(wrapper.props('modelValue')).toBe('byte');
    expect(wrapper.find('[title="Kellie Jubela"]').text()).toBe('KJ');
  });
});
