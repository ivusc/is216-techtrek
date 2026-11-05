import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LinksCard from '@/components/profile/LinksCard.vue';

describe('LinksCard', () => {
  it('links only to safe https URLs', () => {
    const wrapper = mount(LinksCard, {
      props: { github: 'javascript:alert(1)', linkedin: 'https://www.linkedin.com/in/kellie' },
    });

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));

    expect(hrefs).toEqual(['https://www.linkedin.com/in/kellie']);
  });

  it('shows the Telegram username as a link and edits it', async () => {
    const wrapper = mount(LinksCard, { props: { telegram: 'kellie_j' } });
    expect(wrapper.find('a[href="https://t.me/kellie_j"]').text()).toContain('t.me/kellie_j');

    const editing = mount(LinksCard, { props: { editing: true, telegram: '', 'onUpdate:telegram': (value) => editing.setProps({ telegram: value }) } });
    await editing.find('#profile-telegram').setValue('kellie_j');
    expect(editing.props('telegram')).toBe('kellie_j');
  });
});

