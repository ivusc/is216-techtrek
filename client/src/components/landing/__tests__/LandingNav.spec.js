import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LandingNav from '@/components/landing/LandingNav.vue';

const RouterLink = { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' };

function mountNav(props = {}) {
  return mount(LandingNav, { props, global: { stubs: { RouterLink } } });
}

describe('LandingNav', () => {
  it('offers Log in and Sign up to guests, and Open TechTrek once logged in', () => {
    const guest = mountNav();
    expect(guest.findAll('a').map((link) => link.text())).toEqual(expect.arrayContaining(['Log in', 'Sign up']));
    expect(guest.find('a[data-to*="signup"]').text()).toBe('Sign up');

    expect(mountNav({ loggedIn: true }).text()).toContain('Open TechTrek');
  });

  it('underlines the section on screen and asks the page to scroll to a link', async () => {
    const wrapper = mountNav({ active: 'features' });
    const link = wrapper.findAll('.nav-link-btn').find((button) => button.text() === 'Features');

    expect(link.classes()).toContain('is-active');
    expect(wrapper.findAll('.nav-link-btn').map((button) => button.text())).toEqual(['The problem', 'Features', 'How it works']);
    await wrapper.findAll('.nav-link-btn').find((button) => button.text() === 'How it works').trigger('click');
    expect(wrapper.emitted('go')).toEqual([['how']]);
  });

  it('opens and closes the phone menu, and closes it after a link', async () => {
    const wrapper = mountNav();
    const menu = () => wrapper.find('#landing-menu');

    await wrapper.find('.menu-btn').trigger('click');
    expect(menu().classes()).toContain('is-open');
    await wrapper.findAll('.mobile-link')[0].trigger('click');
    expect(menu().classes()).not.toContain('is-open');
    expect(wrapper.emitted('go')).toEqual([['problem']]);
  });

  it('gets a shadow once the page has scrolled', () => {
    expect(mountNav({ scrolled: true }).find('header').classes()).toContain('is-scrolled');
  });
});
