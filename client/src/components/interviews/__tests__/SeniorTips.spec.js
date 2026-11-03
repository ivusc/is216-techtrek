import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SeniorTips from '@/components/interviews/SeniorTips.vue';

process.env.TZ = 'Asia/Singapore';

const TIPS = [
  {
    organisation: 'Grab',
    title: 'Software Engineer Intern',
    difficulty: 4,
    rounds: 'Online assessment, then two technical interviews',
    tips: 'Revise graphs and talk through your thinking out loud.',
    createdAt: '2026-11-02T02:00:00.000Z',
  },
  {
    organisation: 'DBS',
    title: 'Software Engineer Intern',
    difficulty: 1,
    tips: 'Know your CV well.',
    createdAt: '2026-10-30T02:00:00.000Z',
  },
];

describe('SeniorTips', () => {
  it('lists each tip with its role, difficulty, rounds and an anonymous byline', () => {
    const wrapper = mount(SeniorTips, { props: { tips: TIPS } });

    expect(wrapper.find('h2').text()).toBe('Senior tips');
    const [grab, dbs] = wrapper.findAll('li');
    expect(grab.text()).toContain('Grab · Software Engineer Intern');
    expect(grab.find('.badge').text()).toBe('Difficulty 4/5 · Hard');
    expect(grab.text()).toContain('Rounds: Online assessment, then two technical interviews');
    expect(grab.text()).toContain('Revise graphs and talk through your thinking out loud.');
    expect(grab.text()).toContain('An SMU senior · 2 Nov');
    expect(dbs.find('.badge').text()).toBe('Difficulty 1/5 · Easy');
    expect(dbs.text()).not.toContain('Rounds:');
  });

  it('explains where tips come from when there are none', () => {
    const wrapper = mount(SeniorTips, { props: { tips: [] } });

    expect(wrapper.findAll('li')).toHaveLength(0);
    expect(wrapper.text()).toContain("No tips yet for the roles you're preparing for.");
  });

  it('says when the filters hide every tip', () => {
    const wrapper = mount(SeniorTips, { props: { tips: [], filtered: true } });

    expect(wrapper.text()).toContain('No tips match these filters.');
    expect(wrapper.text()).not.toContain('No tips yet');
  });
});
