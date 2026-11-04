import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import InviteFriendsModal from '@/components/teams/InviteFriendsModal.vue';
import { ledTeam, REQUESTER } from '@/__tests__/fixtures/teams';

const mock = new MockAdapter(serverAPI);
afterEach(() => mock.reset());

async function mountInvite(team, props = {}) {
  mock.onGet(`/teams/${team._id}/invites`).reply(200, []);
  const wrapper = mount(InviteFriendsModal, { props: { team, ...props } });
  await flushPromises();
  return wrapper;
}

const roles = (wrapper) => wrapper.findAll('[role="radio"]');
const inviteButton = (wrapper) => wrapper.find('form button[type="submit"]');

describe('InviteFriendsModal', () => {
  it('asks which open role the invite is for and sends it', async () => {
    const team = ledTeam({ openRoles: ['Frontend developer', 'Backend developer'] });
    mock.onPost(`/teams/${team._id}/invites`).reply(201, { _id: 'i1', status: 'pending', user: REQUESTER });
    const wrapper = await mountInvite(team);

    expect(roles(wrapper).map((choice) => choice.text())).toEqual(['Frontend developer', 'Backend developer']);
    await wrapper.find('#invite-email').setValue('ezekiel.ng@smu.edu.sg');
    expect(inviteButton(wrapper).attributes('disabled')).toBeDefined();

    await roles(wrapper)[1].trigger('click');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userName: 'ezekiel.ng@smu.edu.sg', message: '', role: 'Backend developer' });
  });

  it("starts with the role from the open spot it was opened from", async () => {
    const wrapper = await mountInvite(ledTeam({ openRoles: ['Frontend developer', 'Backend developer'] }), { initialRole: 'Backend developer' });

    expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Backend developer');
  });

  it('has no role choice for a team without open roles', async () => {
    const team = ledTeam();
    mock.onPost(`/teams/${team._id}/invites`).reply(201, { _id: 'i1', status: 'pending', user: REQUESTER });
    const wrapper = await mountInvite(team);

    expect(roles(wrapper)).toHaveLength(0);
    await wrapper.find('#invite-email').setValue('ezekiel.ng@smu.edu.sg');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userName: 'ezekiel.ng@smu.edu.sg', message: '' });
  });
});
