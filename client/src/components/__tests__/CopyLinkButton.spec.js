import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CopyLinkButton from '@/components/CopyLinkButton.vue';

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CopyLinkButton', () => {
  it('copies the link, says so, then goes back to normal', async () => {
    vi.useFakeTimers();
    const wrapper = mount(CopyLinkButton, {
      props: { getLink: async () => 'https://techtrek.test/teams/t1' },
    });

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('https://techtrek.test/teams/t1');
    expect(wrapper.find('button').text()).toBe('Link copied');
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.find('button').text()).toBe('Copy link');
  });

  it('shows the link to copy by hand when the browser blocks copying', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const wrapper = mount(CopyLinkButton, {
      props: { getLink: () => 'https://techtrek.test/teams/t1' },
    });

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('input').element.value).toBe('https://techtrek.test/teams/t1');
  });

  it('says so when the link could not be made', async () => {
    const wrapper = mount(CopyLinkButton, {
      props: {
        getLink: async () => {
          throw new Error('offline');
        },
      },
    });

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("Couldn't make a link");
    expect(writeText).not.toHaveBeenCalled();
  });

  it('can be an icon-only button with the label as its name', () => {
    const wrapper = mount(CopyLinkButton, {
      props: { getLink: () => '', compact: true, label: 'Copy link to share' },
    });

    expect(wrapper.find('button').attributes('aria-label')).toBe('Copy link to share');
    expect(wrapper.find('button').text()).toBe('');
  });
});
