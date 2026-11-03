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
});
