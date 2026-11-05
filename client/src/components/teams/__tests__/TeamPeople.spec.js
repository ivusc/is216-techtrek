import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import TeamPeople from '@/components/teams/TeamPeople.vue';
import { team, LEADER, REQUESTER } from '@/__tests__/fixtures/teams';

function mountPeople(overrides = {}) {
  return mount(TeamPeople, {
    props: { team: team({ slotsOpen: 2, ...overrides }) },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

const mock = new MockAdapter(serverAPI);
beforeEach(() => setActivePinia(createPinia()));
afterEach(() => mock.reset());

const openSpot = (wrapper) => wrapper.find('[aria-label="Invite someone to this open spot"]');

describe('TeamPeople', () => {
  it('opens the share box with the team link when an open spot is clicked', async () => {
    const wrapper = mountPeople();

    await openSpot(wrapper).trigger('click');

    const panel = wrapper.find('.share-panel');
    expect(panel.text()).toContain('Know someone for this spot?');
    expect(panel.find('input').element.value).toBe(window.location.origin + '/teams?team=' + wrapper.props('team')._id);
    expect(panel.text()).toContain('Copy link');
    expect(panel.text()).not.toContain('Invite by SMU email');

    await openSpot(wrapper).trigger('click');
    expect(wrapper.find('.share-panel').exists()).toBe(false);
  });

  it('lets the team lead invite by email from an open spot', async () => {
    const wrapper = mountPeople({ isLeader: true, status: 'open' });

    expect(openSpot(wrapper).text()).toContain('Invite someone');
    await openSpot(wrapper).trigger('click');
    expect(wrapper.find('.share-panel').text()).toContain('Fill this spot');

    // the email form drops down right in the box, no new window
    const toggle = wrapper.findAll('.share-panel button').find((button) => button.text() === 'Invite by SMU email');
    expect(wrapper.find('.email-invite').exists()).toBe(false);
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');

    await wrapper.find('#invite-email').setValue('not-an-email');
    await wrapper.find('.email-invite').trigger('submit');
    expect(wrapper.find('.email-invite [role="alert"]').text()).toBe("Type your friend's @smu.edu.sg email.");

    mock.onPost('/teams/' + wrapper.props('team')._id + '/invites').reply(201, { _id: 'i1', status: 'pending', user: { _id: 'u7', displayName: 'Chloe Teo' } });
    await wrapper.find('#invite-email').setValue('Chloe.Teo@smu.edu.sg');
    await wrapper.find('.email-invite').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userName: 'chloe.teo@smu.edu.sg' });
    expect(wrapper.find('.email-invite [role="status"]').text()).toContain('Invite sent to Chloe Teo!');
    expect(wrapper.find('#invite-email').element.value).toBe('');
    expect(wrapper.emitted('invited')).toEqual([[{ role: null, user: { _id: 'u7', displayName: 'Chloe Teo' } }]]);
  });

  it('names the open spots after the open roles', () => {
    const wrapper = mountPeople({ openRoles: ['Designer'] });
    const spots = wrapper.findAll('[aria-label^="Invite someone"]').map((spot) => spot.find('.person-name').text() + ' / ' + spot.find('.person-role').text());

    expect(spots).toEqual(['Designer / Open role', 'Open spot / Could be you']);
  });

  it('lets the lead give a member a role, with the open roles as shortcuts', async () => {
    const wrapper = mountPeople({
      isLeader: true,
      openRoles: ['Designer'],
      members: [
        { user: LEADER, role: 'Team lead' },
        { user: REQUESTER, role: '' },
      ],
    });

    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');
    await wrapper.findAll('.role-editor button').find((chip) => chip.text() === 'Designer').trigger('click');
    await wrapper.find('.role-editor').trigger('submit');

    expect(wrapper.emitted('assign-role')).toEqual([[{ userId: REQUESTER._id, role: 'Designer' }]]);

    // once the page hands back the updated team, the button says Saved
    await wrapper.setProps({ team: { ...wrapper.props('team'), members: [{ user: LEADER, role: 'Team lead' }, { user: REQUESTER, role: 'Designer' }] } });
    expect(wrapper.find('.role-editor button[type="submit"]').text()).toBe('Saved');
  });

  it('pops up their profile card with their description when their circle is clicked', async () => {
    const wrapper = mountPeople({
      members: [
        { user: { ...LEADER, about: 'I love building with Vue.', skills: ['Vue.js'] }, role: 'Team lead' },
        { user: REQUESTER, role: 'Backend' },
      ],
    });
    expect(wrapper.find('.member-card').exists()).toBe(false);

    await wrapper.find(`[aria-label="See ${LEADER.displayName}'s profile"]`).trigger('click');
    const card = wrapper.find('.member-card');
    expect(card.text()).toContain('I love building with Vue.');
    expect(card.text()).toContain('Vue.js');
    expect(card.findComponent(RouterLinkStub).props('to')).toBe('/people/' + LEADER._id);

    // a long description starts folded, with Read more
    await wrapper.setProps({
      team: {
        ...wrapper.props('team'),
        members: [{ user: { ...LEADER, about: 'x'.repeat(200) }, role: 'Team lead' }, { user: REQUESTER, role: 'Backend' }],
      },
    });
    expect(wrapper.find('.member-about').classes()).toContain('is-clamped');
    const more = wrapper.findAll('.member-card button').find((b) => b.text() === 'Read more');
    await more.trigger('click');
    expect(wrapper.find('.member-about').classes()).not.toContain('is-clamped');
    expect(more.text()).toBe('Show less');

    // someone with no description yet
    await wrapper.find('[aria-label="See Ezekiel Ng\'s profile"]').trigger('click');
    expect(wrapper.find('.member-card').text()).toContain("Ezekiel hasn't written a description yet.");

    // the close button and clicking the circle again both close it
    await wrapper.find('[aria-label="Close profile"]').trigger('click');
    expect(wrapper.find('.member-card').exists()).toBe(false);
  });

  it('shows who was invited on their open role, and the spot stays open', async () => {
    const wrapper = mountPeople({
      openRoles: ['Frontend developer', 'Designer'],
      pendingInvites: [{ role: 'Designer', user: { _id: 'u9', displayName: 'Alicia Tan' } }, { role: null, user: null }],
    });
    const designer = wrapper.find('[aria-label="Invite someone to be the Designer"]');
    expect(designer.text()).toContain('Invited Alicia');
    expect(designer.find('.invite-badge').exists()).toBe(true);
    // an invite without a role (or that the viewer can't see) takes the other free spot
    expect(wrapper.find('[aria-label="Invite someone to be the Frontend developer"]').text()).toContain('Invite sent');

    await designer.trigger('click');
    expect(wrapper.find('.waiting-list').text()).toContain('Alicia Tan');
    expect(wrapper.find('.share-panel input').element.value).toContain('&role=Designer');
  });

  it('shows everyone invited for the same role on that role\'s circle', async () => {
    const wrapper = mountPeople({
      slotsOpen: 3,
      openRoles: ['Frontend developer', 'Backend developer', 'Designer'],
      pendingInvites: [
        { role: 'Frontend developer', user: { _id: 'a', displayName: 'Alicia Tan' } },
        { role: 'Frontend developer', user: { _id: 'c', displayName: 'Chloe Teo' } },
      ],
    });
    const frontend = wrapper.find('[aria-label="Invite someone to be the Frontend developer"]');
    expect(frontend.text()).toContain('Invited Alicia +1');
    expect(frontend.find('.invite-badge').text()).toBe('2');
    expect(wrapper.find('[aria-label="Invite someone to be the Backend developer"]').text()).toContain('Open role');

    await frontend.trigger('click');
    const rows = wrapper.findAll('.waiting-list li').map((row) => row.text().replace(/\s+/g, ' '));
    expect(rows).toEqual(['ATAlicia TanInvited', 'CTChloe TeoInvited']);
  });

  it('lists who was invited and who asked for the role, with a way to answer the requests', async () => {
    const wrapper = mountPeople({
      isLeader: true,
      openRoles: ['Frontend developer', 'Designer'],
      pendingInvites: [{ role: 'Frontend developer', user: { _id: 'a', displayName: 'Alicia Tan' } }],
      pendingRequests: [
        { _id: 'r1', role: 'frontend developer', user: { _id: 'm', displayName: 'Marcus Lee' } },
        { _id: 'r2', role: 'Designer', user: { _id: 's', displayName: 'Sarah Lim' } },
      ],
    });

    await wrapper.find('[aria-label="Invite someone to be the Frontend developer"]').trigger('click');
    const list = wrapper.find('.waiting-list');
    expect(list.text()).toContain('WAITING FOR THIS ROLE · 2');
    expect(list.findAll('li').map((row) => row.text().replace(/\s+/g, ' '))).toEqual(['ATAlicia TanInvited', 'MLMarcus LeeAsked to join Answer']);
    const links = list.findAllComponents(RouterLinkStub).map((link) => link.props('to'));
    expect(links).toEqual(['/people/a', '/people/m', { path: '/teams', query: { tab: 'requests' } }]);
  });

  it('shows no role editor to members who are not the lead', async () => {
    const wrapper = mountPeople();

    await wrapper.find('.person').trigger('click');
    expect(wrapper.find('.role-editor').exists()).toBe(false);
  });

  it('gives each open role its own link that names the role', async () => {
    const wrapper = mountPeople({ openRoles: ['Pitch & business'] });
    const base = window.location.origin + '/teams?team=' + wrapper.props('team')._id;

    await wrapper.find('[aria-label="Invite someone to be the Pitch & business"]').trigger('click');
    expect(wrapper.find('.share-panel input').element.value).toBe(base + '&role=Pitch%20%26%20business');
    expect(wrapper.find('.share-panel').text()).toContain('Know someone for Pitch & business?');

    // the open spot without a role keeps the plain team link
    await wrapper.find('[aria-label="Invite someone to this open spot"]').trigger('click');
    expect(wrapper.find('.share-panel input').element.value).toBe(base);
  });

  it("passes the open spot's role on to the invite form", async () => {
    const wrapper = mountPeople({ isLeader: true, status: 'open', openRoles: ['Designer'] });

    await wrapper.find('[aria-label="Invite someone to be the Designer"]').trigger('click');
    await wrapper.findAll('.share-panel button').find((button) => button.text() === 'Invite by SMU email').trigger('click');
    expect(wrapper.find('.email-invite').text()).toContain('for Designer');

    mock.onPost(/invites$/).reply(400, { error: 'No TechTrek account uses that email yet. Send them your invite link instead!' });
    await wrapper.find('#invite-email').setValue('friend@smu.edu.sg');
    await wrapper.find('.email-invite').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userName: 'friend@smu.edu.sg', role: 'Designer' });
    expect(wrapper.find('.email-invite [role="alert"]').text()).toContain('No TechTrek account uses that email yet');
  });
});
