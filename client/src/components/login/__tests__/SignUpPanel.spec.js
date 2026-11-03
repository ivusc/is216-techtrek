import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import SignUpPanel from '@/components/login/SignUpPanel.vue';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  mock.onPost('/register').reply(201, { user: { _id: 'u1', userName: 'new.user@smu.edu.sg' } });
});

afterEach(() => mock.reset());

describe('SignUpPanel', () => {
  it('counts a leading space towards the eight character minimum, as the server does', async () => {
    const wrapper = mount(SignUpPanel);
    const [password, confirm] = wrapper.findAll('input[type="password"]');
    await wrapper.find('input[type="email"]').setValue('new.user@smu.edu.sg');
    await password.setValue(' Abcde1!');
    await confirm.setValue(' Abcde1!');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mock.history.post).toHaveLength(1);
  });
});
