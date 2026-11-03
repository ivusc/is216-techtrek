import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import JoinRequestModal from '@/components/teams/JoinRequestModal.vue';
import { team } from '@/__tests__/fixtures/teams';

process.env.TZ = 'Asia/Singapore';

function mountModal(props = {}) {
  return mount(JoinRequestModal, { props: { team: team(), ...props } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

function chosenRole(wrapper) {
  return wrapper
    .findAll('button.rounded-pill')
    .filter((candidate) => candidate.classes('bg-primary-subtle'))
    .map((candidate) => candidate.text());
}

describe('JoinRequestModal', () => {
  it('names the team, its event, open slots and close date', () => {
    const wrapper = mountModal();

    expect(wrapper.find('h2').text()).toBe('Request to join Byte Me');
    expect(wrapper.text()).toContain('Hack&Roll · 2 of 4 slots open · Closes 21 Nov');
    expect(wrapper.find('label[for="join-message"]').text()).toBe('Message to Ivus Chua');
  });

  it('preselects the first matched skill', () => {
    expect(chosenRole(mountModal({ mySkills: ['figma', 'vue.js'] }))).toEqual(['Vue.js']);
    expect(chosenRole(mountModal({ mySkills: ['figma'] }))).toEqual(['Figma']);
  });

  it('disables send until a role is chosen', async () => {
    const wrapper = mountModal();

    expect(button(wrapper, 'Send request').attributes('disabled')).toBeDefined();
    await button(wrapper, 'Figma').trigger('click');
    expect(button(wrapper, 'Send request').attributes('disabled')).toBeUndefined();
  });

  it('needs no role when the team lists no skills', () => {
    const wrapper = mountModal({ team: team({ skills: [] }) });

    expect(wrapper.text()).toContain('Anyone keen to join');
    expect(button(wrapper, 'Send request').attributes('disabled')).toBeUndefined();
  });

  it('emits the payload', async () => {
    const wrapper = mountModal({ mySkills: ['Vue.js'] });

    await wrapper.find('#join-message').setValue('Keen to help.');
    await wrapper.find('#join-share').setValue(false);
    await button(wrapper, 'Send request').trigger('click');

    expect(wrapper.emitted('submit')).toEqual([
      [{ role: 'Vue.js', message: 'Keen to help.', shareProfile: false }],
    ]);
    expect(wrapper.text()).toContain('13 / 500');
  });

  it('shows the server error and stays busy while sending', () => {
    const wrapper = mountModal({
      mySkills: ['Vue.js'],
      error: 'You are already in this team',
      busy: true,
    });

    expect(wrapper.text()).toContain('You are already in this team');
    expect(button(wrapper, 'Sending...').attributes('disabled')).toBeDefined();
  });
});
