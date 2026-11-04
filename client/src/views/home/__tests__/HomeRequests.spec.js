import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import HomeView from '@/views/home/HomeView.vue';
import { ME, joinRequest } from '@/__tests__/fixtures/teams';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ query: {} }) }));

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME };
  mock.onGet('/teams/invites').reply(200, []);
  mock.onGet('/interview/dashboard').reply(200, { averageScore: 0 });
});
afterEach(() => mock.reset());

async function mountHome(request) {
  mock.onGet('/teams/requests/incoming').reply(200, [request]);
  mock.onGet(/.*/).reply(200, []); // everything else on the dashboard: empty
  mock.onPatch(`/teams/requests/${request._id}`).reply((config) => [200, { _id: request._id, status: 'accepted', role: JSON.parse(config.data).role }]);
  const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true, PageHeader: true, OpportunityCard: true, MiniCalendar: true, TrekLoader: true } } });
  await flushPromises();
  return wrapper;
}

const roleSelect = (wrapper) => wrapper.find('select.role-select');

describe('Home team requests card', () => {
  it('lets the lead pick the open role to accept someone as, right on the card', async () => {
    const request = joinRequest({ role: 'Designer', team: { ...joinRequest().team, openRoles: ['Frontend developer', 'Designer'] } });
    const wrapper = await mountHome(request);

    expect(roleSelect(wrapper).element.value).toBe('Designer');
    await roleSelect(wrapper).setValue('Frontend developer');
    await wrapper.find('[aria-label="Accept as Frontend developer"]').trigger('click');
    await flushPromises();

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'accepted', role: 'Frontend developer' });
  });

  it('starts on an open role and says so when the one they asked for was filled', async () => {
    const request = joinRequest({ role: 'Designer', team: { ...joinRequest().team, openRoles: ['Backend developer'] } });
    const wrapper = await mountHome(request);

    expect(roleSelect(wrapper).element.value).toBe('Backend developer');
    expect(wrapper.text()).toContain('Designer was filled, pick another');
  });

  it('keeps the plain accept for teams without open roles', async () => {
    const wrapper = await mountHome(joinRequest({ role: 'Figma' }));

    expect(roleSelect(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain('as Figma');
    await wrapper.find('[aria-label="Accept as Figma"]').trigger('click');
    await flushPromises();
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'accepted' });
  });
});
