import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import PersonView from '@/views/profile/PersonView.vue';

const route = vi.hoisted(() => ({ params: { id: 'u2' } }));
const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));

const mock = new MockAdapter(serverAPI);
enableAutoUnmount(afterEach);

const RAVI = {
  _id: 'u2',
  userName: 'ravi.k@smu.edu.sg',
  displayName: 'Ravi Katiyar',
  year: 3,
  course: 'Information Systems',
  faculty: 'SCIS',
  about: 'Building beautiful and intuitive digital experiences.',
  skills: ['Figma', 'Vue.js'],
  openToTeams: true,
  githubUrl: 'https://github.com/ravi',
  linkedinUrl: 'https://www.linkedin.com/in/ravi',
};

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { _id: 'u1', userName: 'kellie.j@smu.edu.sg', skills: [] };
  route.params.id = 'u2';
});
afterEach(() => mock.reset());

async function mountView() {
  const wrapper = mount(PersonView, { global: { stubs: { RouterLink: RouterLinkStub, TrekLoader: true } } });
  await flushPromises();
  return wrapper;
}

describe('PersonView', () => {
  it("shows someone's profile with their description, skills, links and an email button", async () => {
    mock.onGet('/users/u2').reply(200, { user: RAVI });
    const wrapper = await mountView();
    const text = wrapper.text();

    expect(text).toContain('Ravi Katiyar');
    expect(text).toContain('Year 3 · Information Systems');
    expect(text).toContain('School of Computing and Information Systems');
    expect(text).toContain('Building beautiful and intuitive digital experiences.');
    expect(text).toContain('Figma');
    expect(text).toContain('Open to teams');
    expect(wrapper.find('a[href="https://github.com/ravi"]').exists()).toBe(true);
    expect(wrapper.find('a[href="https://www.linkedin.com/in/ravi"]').exists()).toBe(true);

    const cta = wrapper.find('a.person-cta');
    expect(cta.text()).toContain('Email Ravi');
    expect(cta.attributes('href')).toBe('https://outlook.office.com/mail/deeplink/compose?to=ravi.k%40smu.edu.sg');
  });

  it('says when they have no description yet', async () => {
    mock.onGet('/users/u2').reply(200, { user: { ...RAVI, about: undefined } });
    const wrapper = await mountView();
    expect(wrapper.text()).toContain("Ravi hasn't written about themselves yet.");
  });

  it('offers to edit your profile when it is yours', async () => {
    route.params.id = 'u1';
    mock.onGet('/users/u1').reply(200, { user: { ...RAVI, _id: 'u1' } });
    const wrapper = await mountView();

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/profile');
    expect(wrapper.find('a.person-cta').exists()).toBe(false);
  });

  it('says when the person cannot be found', async () => {
    mock.onGet('/users/u2').reply(404, { error: 'This person is not on TechTrek.' });
    const wrapper = await mountView();
    expect(wrapper.text()).toContain("We couldn't find this person");
  });
});
