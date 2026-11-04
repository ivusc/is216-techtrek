import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SuggestedTeammates from '@/components/teams/SuggestedTeammates.vue';

const MATCHES = [
  {
    _id: 'u1',
    displayName: 'Kellie Jubela',
    year: 1,
    course: 'Information Systems',
    matchedSkills: ['Vue.js', 'Figma'],
    githubUrl: 'https://github.com/kelliej',
  },
  { _id: 'u2', displayName: 'Ivus Chua', matchedSkills: ['Vue.js'], githubUrl: 'javascript:x' },
];

describe('SuggestedTeammates', () => {
  it('shows how many people match and their matching skills', async () => {
    const wrapper = mount(SuggestedTeammates, { props: { matches: MATCHES } });

    expect(wrapper.text()).toContain('2 people match your team');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true');

    expect(wrapper.text()).toContain('Kellie Jubela');
    expect(wrapper.findAll('.matched-skill').map((chip) => chip.text())).toEqual([
      'Vue.js',
      'Figma',
      'Vue.js',
    ]);
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([
      'https://github.com/kelliej',
    ]);
  });

  it('says so when nobody matches', () => {
    const wrapper = mount(SuggestedTeammates, { props: { matches: [] } });

    expect(wrapper.text()).toContain('No one open to teams has these skills yet.');
  });
});
