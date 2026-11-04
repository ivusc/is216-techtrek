import process from 'node:process';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import { mount } from '@vue/test-utils';
import JoinRequestModal from '@/components/teams/JoinRequestModal.vue';
import { team, ME } from '@/__tests__/fixtures/teams';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME };
});

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

  it('shows the team as circles with me in the first open spot, taking the role I pick', async () => {
    const wrapper = mountModal();
    const you = () => wrapper.find('.is-you');

    expect(you().find('.person-name').text()).toBe('You');
    expect(you().find('.person-role').text()).toBe('Your spot');
    await button(wrapper, 'Figma').trigger('click');
    expect(you().find('.person-role').text()).toBe('Figma');
    // 2 slots open: one is me, one is still free
    expect(wrapper.findAll('[aria-label="Invite someone to this open spot"]')).toHaveLength(1);
  });

  it('asks for one of the open roles when the team lists them', async () => {
    const wrapper = mountModal({ team: team({ openRoles: ['Frontend developer', 'Designer'] }), mySkills: ['Vue.js'] });

    expect(wrapper.text()).toContain('Which open role are you asking for?');
    expect(wrapper.findAll('[role="radio"]').map((choice) => choice.text())).toEqual(['Frontend developer', 'Designer']);
    expect(button(wrapper, 'Send request').attributes('disabled')).toBeDefined();
    // the other open role still shows as an open circle
    await wrapper.findAll('[role="radio"]')[1].trigger('click');
    expect(wrapper.find('.is-you .person-role').text()).toBe('Designer');
    expect(wrapper.find('[aria-label="Ask to be the Frontend developer"]').exists()).toBe(true);

    await button(wrapper, 'Send request').trigger('click');
    expect(wrapper.emitted('submit')[0][0].role).toBe('Designer');
  });

  it('picks the only open role straight away', () => {
    const wrapper = mountModal({ team: team({ openRoles: ['Designer', 'Designer'] }) });

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(1);
    expect(button(wrapper, 'Send request').attributes('disabled')).toBeUndefined();
  });

  it("starts with the role from a role's link, and lists each role once", () => {
    const wrapper = mountModal({
      team: team({ openRoles: ['Frontend developer', 'Marketing', 'Frontend Developer'] }),
      initialRole: 'marketing',
    });

    expect(wrapper.findAll('[role="radio"]').map((choice) => choice.text())).toEqual(['Frontend developer', 'Marketing']);
    expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Marketing');
  });

  it('picks a role by tapping its circle, and highlights my circle with it', async () => {
    const wrapper = mountModal({ team: team({ openRoles: ['Data analyst', 'Frontend developer'] }) });

    // before picking, every open role has its own circle and I'm not placed yet
    expect(wrapper.find('.is-you').exists()).toBe(false);
    expect(wrapper.findAll('[aria-label^="Ask to be the"]')).toHaveLength(2);
    await wrapper.find('[aria-label="Ask to be the Frontend developer"]').trigger('click');

    expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Frontend developer');
    expect(wrapper.find('.is-you').classes()).toContain('is-chosen');
    expect(wrapper.find('.is-you .person-role').text()).toBe('Frontend developer');
    // no share box opens, and no other circle is highlighted
    expect(wrapper.find('.share-panel').exists()).toBe(false);
    expect(wrapper.findAll('.person.is-open')).toHaveLength(0);
  });
});
