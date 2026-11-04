import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import InviteFriendsModal from '@/components/teams/InviteFriendsModal.vue';
import { ledTeam } from '@/__tests__/fixtures/teams';

const mock = new MockAdapter(serverAPI);

const PENDING = { _id: 'i1', status: 'pending', user: { displayName: 'Ezekiel Ng' } };
const JOINED = { _id: 'i2', status: 'accepted', user: { displayName: 'Kellie Jubela' } };

async function mountModal() {
  const wrapper = mount(InviteFriendsModal, { props: { team: ledTeam() } });
  await flushPromises();
  return wrapper;
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mock.onGet('/teams/m1/invites').reply(200, [PENDING, JOINED]);
});

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('InviteFriendsModal', () => {
  it('shows the team, open slots and an invite link to the team', async () => {
    const wrapper = await mountModal();

    expect(wrapper.find('h2').text()).toBe('Invite friends to Night Owls');
    expect(wrapper.text()).toContain('2 slots open');
    expect(wrapper.find('#invite-link').element.value).toBe(
      window.location.origin + '/teams?team=m1',
    );
  });

  it('lists existing invites with their status, and Cancel only for pending ones', async () => {
    const wrapper = await mountModal();
    const text = wrapper.text();

    expect(text).toContain('Ezekiel Ng');
    expect(text).toContain('Invited');
    expect(text).toContain('Joined');
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Cancel')).toHaveLength(1);
  });

  it('copies the link and shows Copied! for two seconds', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = await mountModal();

    await button(wrapper, 'Copy link').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(window.location.origin + '/teams?team=m1');
    expect(wrapper.text()).toContain('Copied!');

    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.text()).toContain('Copy link');
    vi.unstubAllGlobals();
  });

  it('only accepts @smu.edu.sg emails', async () => {
    const wrapper = await mountModal();

    await wrapper.find('#invite-email').setValue('friend@gmail.com');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('[role="alert"]').text()).toBe("Type your friend's @smu.edu.sg email.");
    expect(mock.history.post).toHaveLength(0);
  });

  it('disables Invite until an email is typed', async () => {
    const wrapper = await mountModal();

    expect(button(wrapper, 'Invite').attributes('disabled')).toBeDefined();
    await wrapper.find('#invite-email').setValue('a@smu.edu.sg');
    expect(button(wrapper, 'Invite').attributes('disabled')).toBeUndefined();
  });

  it('sends a tidied invite, clears the form, confirms and reloads the list', async () => {
    mock.onPost('/teams/m1/invites').reply(201, { _id: 'i3', user: { displayName: 'Ezekiel Ng' } });
    const wrapper = await mountModal();

    await wrapper.find('#invite-email').setValue('  Friend@SMU.edu.sg ');
    await wrapper.find('input[aria-label="Note for your friend"]').setValue('  Join us ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      userName: 'friend@smu.edu.sg',
      message: 'Join us',
    });
    expect(wrapper.find('[role="status"]').text()).toContain('Invite sent to Ezekiel Ng!');
    expect(wrapper.find('#invite-email').element.value).toBe('');
    expect(mock.history.get.filter((call) => call.url === '/teams/m1/invites')).toHaveLength(2);
  });

  it('shows the server error when sending fails', async () => {
    mock.onPost('/teams/m1/invites').reply(404, { error: 'No TechTrek account uses that email' });
    const wrapper = await mountModal();

    await wrapper.find('#invite-email').setValue('ghost@smu.edu.sg');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('No TechTrek account uses that email');
  });

  it('cancels a pending invite and reloads the list', async () => {
    mock.onDelete('/teams/invites/i1').reply(204);
    const wrapper = await mountModal();
    mock.onGet('/teams/m1/invites').reply(200, [JOINED]);

    await button(wrapper, 'Cancel').trigger('click');
    await flushPromises();

    expect(mock.history.delete.map((call) => call.url)).toEqual(['/teams/invites/i1']);
    expect(wrapper.text()).not.toContain('Ezekiel Ng');
  });

  it('emits close on Done', async () => {
    const wrapper = await mountModal();

    await button(wrapper, 'Done').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
