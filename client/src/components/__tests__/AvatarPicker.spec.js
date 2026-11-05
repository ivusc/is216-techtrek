import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import AvatarPicker from '@/components/AvatarPicker.vue';

const mock = new MockAdapter(serverAPI);

const PRESETS = [
  { key: 'f1', label: 'Long dark hair', group: 'female' },
  { key: 'f2', label: 'Bun and glasses', group: 'female' },
  { key: 'm1', label: 'Short neat hair', group: 'male' },
];

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

async function mountPicker(props = {}) {
  mock.onGet('/avatars').reply(200, { presets: PRESETS });
  const wrapper = mount(AvatarPicker, { props });
  await flushPromises();
  return wrapper;
}

describe('AvatarPicker', () => {
  it('shows the female and male characters in their own groups', async () => {
    const wrapper = await mountPicker();
    const groups = wrapper.findAll('[role="radiogroup"]');

    expect(
      groups.map((group) =>
        group.findAll('[role="radio"]').map((radio) => radio.attributes('aria-label')),
      ),
    ).toEqual([['Long dark hair', 'Bun and glasses'], ['Short neat hair']]);
    expect(wrapper.text()).toContain('Female');
    expect(wrapper.text()).toContain('Male');
    expect(wrapper.find('img').attributes('src')).toBe(`${serverAPI.defaults.baseURL}/avatars/f1`);
  });

  it('marks the character in use and emits the one clicked', async () => {
    const wrapper = await mountPicker({ selected: 'f2' });
    const radios = wrapper.findAll('[role="radio"]');

    expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    await radios[2].trigger('click');
    await radios[1].trigger('click'); // already in use: nothing to save
    expect(wrapper.emitted('pick')).toEqual([['m1']]);
  });

  it('says so when the characters cannot load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.onGet('/avatars').reply(500);
    const wrapper = mount(AvatarPicker);
    await flushPromises();

    expect(wrapper.text()).toContain("Couldn't load the characters.");
  });
});
