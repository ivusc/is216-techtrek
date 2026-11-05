import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ThemeToggle from '@/components/ThemeToggle.vue';

beforeEach(() => {
  document.documentElement.dataset.bsTheme = 'light';
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('starts from the theme already on the page', () => {
    document.documentElement.dataset.bsTheme = 'dark';
    const button = mount(ThemeToggle).find('button');

    expect(button.attributes('aria-label')).toBe('Switch to light mode');
    expect(button.find('i').classes()).toContain('bi-sun');
  });

  it('flips the page theme and remembers it on each click', async () => {
    const button = mount(ThemeToggle).find('button');
    expect(button.attributes('aria-label')).toBe('Switch to dark mode');

    await button.trigger('click');
    expect(document.documentElement.dataset.bsTheme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(button.attributes('aria-label')).toBe('Switch to light mode');

    await button.trigger('click');
    expect(document.documentElement.dataset.bsTheme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
