import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InvitesBanner from '@/components/teams/InvitesBanner.vue';
import { LEADER, team } from '@/__tests__/fixtures/teams';

const INVITE = { _id: 'i1', message: 'We need you!', team: team({ leader: LEADER }) };

function mountBanner(props = {}) {
  return mount(InvitesBanner, { props: { invites: [INVITE], ...props } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('InvitesBanner', () => {
  it('says who invited you, to which team, and their note', () => {
    const text = mountBanner().text();

    expect(text).toContain('Ivus Chua invited you to join Byte Me');
    expect(text).toContain('Hack&Roll · "We need you!"');
  });

  it('leaves out the note when there is none', () => {
    expect(mountBanner({ invites: [{ ...INVITE, message: '' }] }).text()).not.toContain('"');
  });

  it('emits answer with the invite and the choice', async () => {
    const wrapper = mountBanner();

    await button(wrapper, 'Join team').trigger('click');
    await button(wrapper, 'Decline').trigger('click');

    expect(wrapper.emitted('answer')).toEqual([
      [INVITE, 'accepted'],
      [INVITE, 'declined'],
    ]);
  });

  it('disables only the invite being answered', () => {
    const other = { ...INVITE, _id: 'i2' };
    const wrapper = mountBanner({ invites: [INVITE, other], busyId: 'i1' });
    const [first, second] = wrapper.findAll('.invite-card');

    expect(first.find('button').attributes('disabled')).toBeDefined();
    expect(second.find('button').attributes('disabled')).toBeUndefined();
  });
});
