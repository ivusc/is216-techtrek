import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginPanel from '@/components/login/LoginPanel.vue';
import SignUpPanel from '@/components/login/SignUpPanel.vue';
import LoginView from '@/views/login/LoginView.vue';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
}));

const LOG_IN_SHOWN = {
  logInPressed: 'true',
  signUpPressed: 'false',
  logInVisible: true,
  signUpVisible: false,
};
const SIGN_UP_SHOWN = {
  logInPressed: 'false',
  signUpPressed: 'true',
  logInVisible: false,
  signUpVisible: true,
};

let wrapper;

function tab(name) {
  return wrapper
    .find('#slider')
    .findAll('button')
    .find((button) => button.text() === name);
}

function panels() {
  return {
    logInPressed: tab('Log in').attributes('aria-pressed'),
    signUpPressed: tab('Sign up').attributes('aria-pressed'),
    logInVisible: wrapper.findComponent(LoginPanel).isVisible(),
    signUpVisible: wrapper.findComponent(SignUpPanel).isVisible(),
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  wrapper = mount(LoginView, { attachTo: document.body });
});

afterEach(() => wrapper.unmount());

describe('LoginView', () => {
  it('switches between the panels', async () => {
    expect(panels()).toEqual(LOG_IN_SHOWN);

    await tab('Sign up').trigger('click');
    expect(panels()).toEqual(SIGN_UP_SHOWN);

    await tab('Log in').trigger('click');
    expect(panels()).toEqual(LOG_IN_SHOWN);
  });

  it('opens sign up from the link on the log in panel', async () => {
    await wrapper
      .findAll('a')
      .find((link) => link.text() === 'New to TechTrek? Create an account')
      .trigger('click');

    expect(panels()).toEqual(SIGN_UP_SHOWN);
  });
});
