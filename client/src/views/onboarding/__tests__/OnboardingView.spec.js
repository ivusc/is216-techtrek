import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import OnboardingView from '@/views/onboarding/OnboardingView.vue';

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({ useRouter: () => router }));

const mock = new MockAdapter(serverAPI);

enableAutoUnmount(afterEach);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { _id: 'u1', userName: 'kellie.jubela@smu.edu.sg', skills: [] };
  router.push.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function mountView() {
  return mount(OnboardingView);
}

function submitButton(wrapper) {
  return wrapper.find('button[type="submit"]');
}

async function next(wrapper) {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

async function toSkillsStep(wrapper) {
  await wrapper.find('#onboarding-name').setValue('  Kellie Jubela ');
  await next(wrapper);
  await wrapper.find('input[value="SCIS"]').setValue(true);
  await next(wrapper);
}

describe('OnboardingView', () => {
  it('starts on step 1 and needs a name to continue', async () => {
    const wrapper = mountView();

    expect(wrapper.text()).toContain('STEP 1 OF 3');
    expect(wrapper.find('button').text()).toBe('Continue');
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('#onboarding-name').setValue('   ');
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('#onboarding-name').setValue('Kellie');
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('needs a school on step 2, and Back keeps what was typed', async () => {
    const wrapper = mountView();
    await wrapper.find('#onboarding-name').setValue('Kellie');
    await next(wrapper);

    expect(wrapper.text()).toContain('STEP 2 OF 3');
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.find('input[value="SCIS"]').setValue(true);
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Back')
      .trigger('click');
    expect(wrapper.find('#onboarding-name').element.value).toBe('Kellie');
  });

  it('prefills what we already know about a returning user', () => {
    useUserStore().user = { _id: 'u1', displayName: 'Kellie', faculty: 'SCIS', skills: ['Vue.js'] };
    const wrapper = mountView();

    expect(wrapper.find('#onboarding-name').element.value).toBe('Kellie');
  });

  it('offers to skip skills when none are picked, and Finish once one is', async () => {
    const wrapper = mountView();
    await toSkillsStep(wrapper);

    expect(wrapper.text()).toContain('STEP 3 OF 3');
    expect(submitButton(wrapper).text()).toBe('Skip skills for now');

    await wrapper.findAll('button[aria-pressed]')[0].trigger('click');
    expect(submitButton(wrapper).text()).toBe('Finish');
  });

  it('saves everything at once, marks the user onboarded and goes home', async () => {
    mock
      .onPatch('/me')
      .reply(200, { user: { _id: 'u1', displayName: 'Kellie Jubela', onboarded: true } });
    const wrapper = mountView();
    await toSkillsStep(wrapper);

    await next(wrapper);

    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      displayName: 'Kellie Jubela',
      faculty: 'SCIS',
      skills: [],
      onboarded: true,
    });
    expect(router.push).toHaveBeenCalledWith('/home');
  });

  it('stays on the page and shows the server error when saving fails', async () => {
    mock.onPatch('/me').reply(400, { error: 'Name is too long' });
    const wrapper = mountView();
    await toSkillsStep(wrapper);

    await next(wrapper);

    expect(wrapper.text()).toContain('Name is too long');
    expect(router.push).not.toHaveBeenCalled();
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('falls back to a generic message when the error has no text', async () => {
    mock.onPatch('/me').networkError();
    const wrapper = mountView();
    await toSkillsStep(wrapper);

    await next(wrapper);

    expect(wrapper.text()).toContain('Could not save your profile. Please try again.');
  });
});
