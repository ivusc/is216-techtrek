import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SkillMatchBanner from '@/components/teams/SkillMatchBanner.vue';

describe('SkillMatchBanner', () => {
  it.each([
    [
      'no skills',
      { mySkills: [], matchedSkills: [], matchCount: 0 },
      'Add your skills to get matched',
      'Tell us what you are good at and we will show the teams that are looking for it.',
    ],
    [
      'no match',
      { mySkills: ['Vue.js', 'Figma'], matchedSkills: [], matchCount: 0 },
      'No team needs your skills yet',
      'Your profile has Vue.js and Figma. Check back soon or update your skills.',
    ],
    [
      'one match',
      { mySkills: ['Vue.js'], matchedSkills: ['Vue.js'], matchCount: 1 },
      '1 team needs your skills',
      'Matched on Vue.js from your profile. Keep your profile updated for better matches.',
    ],
    [
      'several matches',
      {
        mySkills: ['Vue.js', 'Figma', 'SQL'],
        matchedSkills: ['Vue.js', 'Figma', 'SQL'],
        matchCount: 3,
      },
      '3 teams need your skills',
      'Matched on Vue.js, Figma and SQL from your profile.',
    ],
  ])('titles the banner for %s', (label, props, title, text) => {
    const wrapper = mount(SkillMatchBanner, { props });

    expect(wrapper.find('.fw-semibold').text()).toBe(title);
    expect(wrapper.find('p.small').text()).toContain(text);
  });

  it('emits edit-skills', async () => {
    const wrapper = mount(SkillMatchBanner, {
      props: { mySkills: [], matchedSkills: [], matchCount: 0 },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('edit-skills')).toHaveLength(1);
  });
});
