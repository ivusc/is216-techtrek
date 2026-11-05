import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/store/user';
import { mount } from '@vue/test-utils';
import TeamDetailsModal from '@/components/teams/TeamDetailsModal.vue';
import { team, LEADER, REQUESTER, ME } from '@/__tests__/fixtures/teams';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...ME, skills: ['vue.js'] };
});

function mountDetails(overrides = {}, props = {}) {
  return mount(TeamDetailsModal, {
    props: {
      team: team({
        members: [
          { user: REQUESTER, role: 'Designer' },
          { user: LEADER, role: 'Team lead' },
        ],
        slotsOpen: 1,
        ...overrides,
      }),
      ...props,
    },
  });
}

describe('TeamDetailsModal', () => {
  it('lists the lead first, then members with their roles, then outside teammates and open spots', () => {
    const wrapper = mountDetails();
    const people = wrapper.findAll('.person').map((person) => person.find('.person-name').text() + ' / ' + person.find('.person-role').text());

    expect(people).toEqual([
      'Ivus Chua / Team lead',
      'Ezekiel Ng / Designer',
      'Teammate / Not on TechTrek',
      'Open spot / Could be you',
    ]);
    expect(wrapper.text()).toContain('3 of 4 spots filled');
    expect(wrapper.text()).toContain('1 more person needed');
  });

  it('shows a member profile with skills and links when their circle is clicked', async () => {
    const wrapper = mountDetails();

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');

    const panel = wrapper.find('.people-panel');
    expect(panel.find('.member-role').text()).toBe('Designer');
    expect(panel.text()).toContain('Y1 Information Systems');
    expect(panel.text()).toContain('Figma');
    expect(panel.find('a[href="https://github.com/ezekiel"]').exists()).toBe(true);

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');
    expect(wrapper.find('.people-panel').exists()).toBe(false);
  });

  it('ticks the wanted skills I have', () => {
    const wrapper = mountDetails();
    const chip = wrapper.findAll('.badge').find((badge) => badge.text() === 'Vue.js');

    expect(chip.find('.bi-check-lg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ticked skills match your profile.');
  });

  it('offers Request to join only when allowed', async () => {
    const footer = (wrapper) => wrapper.findAll('.modal-footer button').map((button) => button.text());

    expect(footer(mountDetails())).toEqual(['Copy link', 'Close']);
    const wrapper = mountDetails({}, { canRequest: true });
    expect(footer(wrapper)).toEqual(['Copy link', 'Close', 'Request to join']);
  });

  it('opens the request form inside the window, and Back closes it again', async () => {
    const footer = (wrapper) => wrapper.findAll('.modal-footer button').map((button) => button.text());
    const wrapper = mountDetails({ openRoles: ['Frontend developer'] }, { canRequest: true });

    await wrapper.findAll('.modal-footer button').find((button) => button.text() === 'Request to join').trigger('click');

    expect(wrapper.find('.request-form').text()).toContain('Ask to join');
    expect(footer(wrapper)).toEqual(['Back', 'Send request']);
    // the only open role is picked, and I'm shown in its spot
    expect(wrapper.find('.is-you .person-role').text()).toBe('Frontend developer');

    await wrapper.findAll('.modal-footer button')[0].trigger('click');
    expect(wrapper.find('.request-form').exists()).toBe(false);
    expect(footer(wrapper)).toEqual(['Copy link', 'Close', 'Request to join']);
  });

  it('sends the request from the window and shows the server reason there', async () => {
    const t = team({ openRoles: ['Frontend developer'] });
    mock.onPost(`/teams/${t._id}/requests`).replyOnce(409, { error: 'This team is not taking requests' });
    mock.onPost(`/teams/${t._id}/requests`).replyOnce(201, { _id: 'r9', status: 'pending' });
    const wrapper = mount(TeamDetailsModal, { props: { team: t, canRequest: true, startRequesting: true } });
    const send = () => wrapper.findAll('.modal-footer button').find((b) => b.text().includes('Send request'));

    await wrapper.find('#join-message').setValue('Keen!');
    await send().trigger('click');
    await flushPromises();
    expect(wrapper.find('.request-form').text()).toContain('This team is not taking requests');

    await send().trigger('click');
    await flushPromises();
    expect(JSON.parse(mock.history.post[1].data)).toEqual({ role: 'Frontend developer', message: 'Keen!', shareProfile: true });
    expect(wrapper.emitted('sent')).toEqual([[{ _id: 'r9', status: 'pending' }]]);
  });

  it('lets people in the team email everyone and message on Telegram', () => {
    const wrapper = mountDetails({
      canContact: true,
      members: [
        { user: { ...LEADER, userName: 'ivus.chua@smu.edu.sg', telegram: 'ivus_c' }, role: 'Team lead' },
        { user: { ...REQUESTER, userName: 'ezekiel.ng@smu.edu.sg' }, role: 'Designer' },
      ],
    });
    const box = wrapper.find('.contact-box');

    // a new Outlook message (SMU email) to everyone, in a new tab
    const email = box.find('a.btn-primary');
    expect(email.attributes('href')).toBe(
      'https://outlook.office.com/mail/deeplink/compose?to=ivus.chua%40smu.edu.sg;ezekiel.ng%40smu.edu.sg&subject=' +
        encodeURIComponent(wrapper.props('team').name),
    );
    expect(email.attributes('target')).toBe('_blank');
    expect(box.text()).toContain('To: ivus.chua@smu.edu.sg, ezekiel.ng@smu.edu.sg');
    expect(box.findAll('a[href^="https://t.me/"]').map((a) => a.attributes('href'))).toEqual(['https://t.me/ivus_c']);
  });

  it('copies everyone\'s email', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const wrapper = mountDetails({
      canContact: true,
      members: [
        { user: { ...LEADER, userName: 'ivus.chua@smu.edu.sg' }, role: 'Team lead' },
        { user: { ...REQUESTER, userName: 'ezekiel.ng@smu.edu.sg' }, role: 'Designer' },
      ],
    });
    const copy = wrapper.findAll('.contact-box button').find((b) => b.text().includes('Copy emails'));
    await copy.trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('ivus.chua@smu.edu.sg; ezekiel.ng@smu.edu.sg');
    expect(wrapper.find('.contact-box').text()).toContain('Copied!');
  });

  it('shows no contacts to people outside the team', () => {
    expect(mountDetails().find('.contact-box').exists()).toBe(false);
  });

  it('copies a link to the team for sharing', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const wrapper = mountDetails();

    await wrapper.findAll('button').find((b) => b.text() === 'Copy link').trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/teams/${team()._id}`);
  });
});

