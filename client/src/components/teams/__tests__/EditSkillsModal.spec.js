import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EditSkillsModal from '@/components/teams/EditSkillsModal.vue';

function mountModal(props = {}) {
  return mount(EditSkillsModal, { props: { skills: ['Vue.js'], ...props } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

describe('EditSkillsModal', () => {
  it('submits the chosen skills without changing the prop', async () => {
    const skills = ['Vue.js'];
    const wrapper = mountModal({ skills });

    await button(wrapper, 'Save skills').trigger('click');

    expect(wrapper.emitted('submit')).toEqual([[['Vue.js']]]);
    expect(wrapper.emitted('submit')[0][0]).not.toBe(skills);
  });

  it('emits close on Cancel', async () => {
    const wrapper = mountModal();

    await button(wrapper, 'Cancel').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('disables save while busy and shows errors', () => {
    const wrapper = mountModal({ busy: true, error: 'Too many skills' });

    expect(button(wrapper, 'Saving...').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Too many skills');
  });
});
