import process from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import TeamCard from '@/components/teams/TeamCard.vue';
import { ledTeam, team, ME, LEADER } from '@/__tests__/fixtures/teams';

process.env.TZ = 'Asia/Singapore';

afterEach(() => vi.useRealTimers());

function mountCard(props) {
  // the details window is teleported to <body>; render it in place so the test can see it
  return mount(TeamCard, { props: { team: team(), ...props }, global: { plugins: [createPinia()], stubs: { teleport: true } } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

describe('TeamCard', () => {
  it.each([
    ['Request to join', null, 2, false],
    ['Request declined', 'declined', 2, true],
    ["You're in!", 'accepted', 2, true],
    ['Team full', null, 0, true],
  ])(
    'shows %s when the request is %s with %i slots open',
    (label, requestStatus, slotsOpen, disabled) => {
      const wrapper = mountCard({ team: team({ requestStatus, slotsOpen }) });
      const join = wrapper.find('button');

      expect(join.text()).toBe(label);
      expect(join.attributes('disabled') !== undefined).toBe(disabled);
      expect(join.classes()).toContain(disabled ? 'btn-light' : 'btn-primary');
    },
  );

  it('opens the team window with the request form from the Request to join button', async () => {
    const wrapper = mountCard();

    await button(wrapper, 'Request to join').trigger('click');

    expect(wrapper.text()).toContain("Who's in the team");
    expect(wrapper.find('.request-form').exists()).toBe(true);
  });

  it('opens the team details from the card or Enter, and can ask to join from there', async () => {
    const wrapper = mountCard();
    expect(wrapper.find('.card').attributes('aria-label')).toBe('See who is in ' + team().name);

    await wrapper.find('h3').trigger('click');
    expect(wrapper.text()).toContain("Who's in the team");

    await button(wrapper, 'Close').trigger('click');
    expect(wrapper.text()).not.toContain("Who's in the team");

    await wrapper.find('.card').trigger('keydown', { key: 'Enter' });
    expect(wrapper.find('.request-form').exists()).toBe(false);
    await wrapper.findAll('.modal-footer button').find((candidate) => candidate.text() === 'Request to join').trigger('click');
    // the form opens in the same window, under the team
    expect(wrapper.text()).toContain("Who's in the team");
    expect(wrapper.find('.request-form').exists()).toBe(true);
  });

  it('opens details but offers no request on a full team', async () => {
    const wrapper = mountCard({ team: team({ slotsOpen: 0 }) });

    await wrapper.find('.card').trigger('click');

    expect(wrapper.text()).toContain('Team is full');
    expect(wrapper.findAll('.modal-footer button').map((candidate) => candidate.text())).toEqual(['Copy link', 'Close']);
  });

  it.each([2, 0])(
    'shows a pending request as sent with an Undo button when %i slots are open',
    async (slotsOpen) => {
      const wrapper = mountCard({ team: team({ requestStatus: 'pending', slotsOpen }) });

      expect(wrapper.text()).toContain('Request sent');
      await button(wrapper, 'Undo').trigger('click');
      expect(wrapper.emitted('undo')).toHaveLength(1);

      await wrapper.setProps({ undoing: true });
      expect(button(wrapper, 'Undoing...').attributes('disabled')).toBeDefined();
    },
  );

  it('shows the leader badges, Requests and Edit post on my teams', async () => {
    const wrapper = mountCard({ team: ledTeam(), mode: 'mine' });

    expect(wrapper.text()).toContain('Leader');
    expect(button(wrapper, 'Request to join')).toBeUndefined();
    await button(wrapper, 'Requests').trigger('click');
    await button(wrapper, 'Edit post').trigger('click');

    expect(wrapper.emitted('view-requests')).toHaveLength(1);
    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  it.each([
    ['Draft', 'draft', ['Edit post']],
    ['Team full', 'closed', ['Requests', 'Edit post']],
  ])('badges a %s post and offers only its actions', (badge, status, actions) => {
    const wrapper = mountCard({ team: ledTeam({ status }), mode: 'mine' });

    expect(wrapper.findAll('.badge').map((chip) => chip.text())).toContain(badge);
    expect(wrapper.findAll('button').map((candidate) => candidate.text())).toEqual(actions);
  });

  it('shows a member badge and only Leave team on a team I joined', async () => {
    const wrapper = mountCard({ team: team(), mode: 'mine' });

    expect(wrapper.text()).toContain('Member');
    expect(wrapper.findAll('button').map((candidate) => candidate.text())).toEqual(['Leave team']);
    await button(wrapper, 'Leave team').trigger('click');
    expect(wrapper.emitted('leave')).toHaveLength(1);
  });

  it('highlights the skills I have whatever their case', () => {
    const wrapper = mountCard({ mySkills: ['vue.js'] });
    const chip = (text) => wrapper.findAll('.badge').find((candidate) => candidate.text() === text);

    expect(chip('Vue.js').classes()).toContain('bg-primary-subtle');
    expect(chip('Figma').classes()).not.toContain('bg-primary-subtle');
  });

  it.each([
    ['2026-11-18T08:00:00+08:00', 'text-tt-accent'],
    ['2026-11-10T08:00:00+08:00', 'text-body-tertiary'],
  ])('colours the close date seen on %s as %s', (now, colour) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    const wrapper = mountCard();
    const closes = wrapper
      .findAll('span')
      .find((candidate) => candidate.text().startsWith('Closes'));

    expect(closes.text()).toBe('Closes 21 Nov');
    expect(closes.classes()).toContain(colour);
  });

  it('shows how many slots are open', () => {
    expect(mountCard().text()).toContain('2 slots open');
    expect(mountCard({ team: team({ slotsOpen: 1 }) }).text()).toContain('1 slot open');
  });

  it('shows my own role in the team on My teams', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useUserStore().user = { ...ME };
    const joined = team({ members: [{ user: LEADER, role: 'Team lead' }, { user: ME, role: 'Backend developer' }] });
    const wrapper = mount(TeamCard, { props: { team: joined, mode: 'mine' }, global: { plugins: [pinia], stubs: { teleport: true } } });

    expect(wrapper.find('.badge.bg-primary-subtle').text()).toBe('Member · Backend developer');

    const led = mount(TeamCard, { props: { team: ledTeam(), mode: 'mine' }, global: { plugins: [pinia], stubs: { teleport: true } } });
    expect(led.find('.badge.bg-primary-subtle').text()).toBe('Leader');
  });
});
