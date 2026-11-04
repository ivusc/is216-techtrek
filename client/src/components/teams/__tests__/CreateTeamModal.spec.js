import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CreateTeamModal from '@/components/teams/CreateTeamModal.vue';
import { ledTeam } from '@/__tests__/fixtures/teams';

process.env.TZ = 'Asia/Singapore';

const LISTINGS = [
  {
    source: 'devpost',
    externalId: '201',
    title: 'Build for Good',
    location: 'Singapore',
    deadline: '2026-11-30T23:59:59.000Z',
  },
  {
    source: 'devpost',
    externalId: '202',
    title: 'Code for Climate',
    location: { icon: 'globe', location: 'Online' },
    deadline: null,
  },
];

const EVENT_FIELDS = ['opportunity', 'opportunityId', 'eventName', 'eventLocation', 'closesAt'];

function mountModal(props = {}) {
  return mount(CreateTeamModal, { props: { events: LISTINGS, ...props } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

async function fill(wrapper, { name = 'Byte Me', pitch = 'We ship.' } = {}) {
  await wrapper.find('#post-name').setValue(name);
  await wrapper.find('#post-pitch').setValue(pitch);
}

function submitted(wrapper) {
  return wrapper.emitted('submit').at(-1)[0];
}

function eventPart(post) {
  return Object.fromEntries(
    EVENT_FIELDS.filter((field) => field in post).map((field) => [field, post[field]]),
  );
}

function optionTexts(wrapper, selector) {
  return wrapper.findAll(`${selector} option`).map((option) => option.text());
}

describe('CreateTeamModal event picker', () => {
  it('offers the listed hackathons and Other, starting on the first listing', () => {
    const wrapper = mountModal();

    expect(optionTexts(wrapper, '#post-event')).toEqual([
      'Build for Good · closes 1 Dec',
      'Code for Climate',
      'Other event (not on the list)',
    ]);
    expect(wrapper.find('#post-event').element.value).toBe('devpost-201');
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(false);
  });

  it.each([
    ['devpost-201', 0],
    ['devpost-202', 1],
  ])('sends listing %s as the opportunity for the server to save and link', async (key, index) => {
    const wrapper = mountModal();

    await fill(wrapper);
    await wrapper.find('#post-event').setValue(key);
    await button(wrapper, 'Publish post').trigger('click');

    expect(submitted(wrapper).status).toBe('open');
    expect(eventPart(submitted(wrapper))).toStrictEqual({ opportunity: LISTINGS[index] });
  });

  it('starts a new post on the hackathon it was opened for', () => {
    const wrapper = mountModal({ initialEvent: 'Code for Climate' });

    expect(wrapper.find('#post-event').element.value).toBe('devpost-202');
  });

  it('starts a new post for a hackathon that is not listed on Other with its name', () => {
    const wrapper = mountModal({ initialEvent: 'Hack&Roll' });

    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').element.value).toBe('Hack&Roll');
  });

  it('lets me type an event that is not listed', async () => {
    const wrapper = mountModal();

    await fill(wrapper);
    await wrapper.find('#post-event').setValue('other');
    await wrapper.find('[aria-label="Event name"]').setValue('Hack&Roll');
    await wrapper.find('[aria-label="Event location"]').setValue('NUS');
    await wrapper.find('[aria-label="Closing date"]').setValue('2026-11-20');
    await button(wrapper, 'Publish post').trigger('click');

    expect(eventPart(submitted(wrapper))).toStrictEqual({
      opportunityId: null,
      eventName: 'Hack&Roll',
      eventLocation: 'NUS',
      closesAt: '2026-11-20',
    });
  });

  it('preselects the listing named by the post being edited', () => {
    const wrapper = mountModal({ team: ledTeam({ event: { name: 'Code for Climate' } }) });

    expect(wrapper.find('#post-event').element.value).toBe('devpost-202');
  });

  it('falls back to Other with the saved event when it is not listed', () => {
    const wrapper = mountModal({ team: ledTeam() });

    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').element.value).toBe('Hack&Roll');
    expect(wrapper.find('[aria-label="Event location"]').element.value).toBe('NUS');
    expect(wrapper.find('[aria-label="Closing date"]').element.value).toBe('2026-11-20');
  });

  it.each([
    ['a typed event', ledTeam(), async () => {}],
    [
      'a typed event typed over and back',
      ledTeam(),
      async (wrapper) => {
        await wrapper.find('[aria-label="Event location"]').setValue('SMU');
        await wrapper.find('[aria-label="Event location"]').setValue('NUS');
      },
    ],
    ['a listed event', ledTeam({ event: { name: 'Build for Good' } }), async () => {}],
    [
      'a listed event switched to Other and back',
      ledTeam({ event: { name: 'Build for Good' } }),
      async (wrapper) => {
        await wrapper.find('#post-event').setValue('other');
        await wrapper.find('#post-event').setValue('devpost-201');
      },
    ],
  ])('sends no event fields for an edit that leaves %s alone', async (label, team, act) => {
    const wrapper = mountModal({ team });

    await act(wrapper);
    await wrapper.find('#post-name').setValue('Renamed');
    await button(wrapper, 'Save changes').trigger('click');

    expect(submitted(wrapper).name).toBe('Renamed');
    expect(eventPart(submitted(wrapper))).toStrictEqual({});
  });

  it.each([
    [
      'the event name',
      ledTeam(),
      ['[aria-label="Event name"]', 'Hack&Roll 2026'],
      { opportunityId: null, eventName: 'Hack&Roll 2026' },
    ],
    [
      'the closing date',
      ledTeam(),
      ['[aria-label="Closing date"]', '2026-11-27'],
      { opportunityId: null, closesAt: '2026-11-27' },
    ],
    [
      'the listing',
      ledTeam({ event: { name: 'Code for Climate' } }),
      ['#post-event', 'devpost-201'],
      { opportunityId: null, opportunity: LISTINGS[0] },
    ],
  ])('sends only what an edit of %s changes', async (label, team, [field, value], sent) => {
    const wrapper = mountModal({ team });

    await wrapper.find(field).setValue(value);
    await button(wrapper, 'Save changes').trigger('click');

    expect(eventPart(submitted(wrapper))).toStrictEqual(sent);
  });
});

describe('CreateTeamModal while the hackathons load', () => {
  it('waits for the list with the picker and the post buttons disabled, then starts on the first listing', async () => {
    const wrapper = mountModal({ events: [], eventsLoading: true });

    expect(optionTexts(wrapper, '#post-event')).toEqual(['Loading hackathons…']);
    expect(wrapper.find('#post-event').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Save draft').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Publish post').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(false);

    await wrapper.setProps({ events: LISTINGS, eventsLoading: false });

    expect(optionTexts(wrapper, '#post-event')).toEqual([
      'Build for Good · closes 1 Dec',
      'Code for Climate',
      'Other event (not on the list)',
    ]);
    expect(wrapper.find('#post-event').element.value).toBe('devpost-201');
    expect(wrapper.find('#post-event').attributes('disabled')).toBeUndefined();
    expect(button(wrapper, 'Publish post').attributes('disabled')).toBeUndefined();
  });

  it('explains a failed load and starts on Other', async () => {
    const wrapper = mountModal({ events: [], eventsLoading: true });

    await wrapper.setProps({ eventsLoading: false, eventsError: true });

    expect(wrapper.text()).toContain(
      "Couldn't load Devpost hackathons. Pick Other and type the event's name.",
    );
    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(true);
  });

  it('preselects the listing of the post being edited once the list arrives and sends no event fields when it is left alone', async () => {
    const wrapper = mountModal({
      team: ledTeam({ event: { name: 'Code for Climate' } }),
      events: [],
      eventsLoading: true,
    });

    expect(button(wrapper, 'Save changes').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Delete post').attributes('disabled')).toBeUndefined();

    await wrapper.setProps({ events: LISTINGS, eventsLoading: false });

    expect(wrapper.find('#post-event').element.value).toBe('devpost-202');
    await wrapper.find('#post-name').setValue('Renamed');
    await button(wrapper, 'Save changes').trigger('click');

    expect(submitted(wrapper).name).toBe('Renamed');
    expect(eventPart(submitted(wrapper))).toStrictEqual({});
  });
});

describe('CreateTeamModal open slots', () => {
  it('starts the open slots at one when publishing a draft', () => {
    const draft = mountModal({ team: ledTeam({ status: 'draft' }) });
    const published = mountModal({ team: ledTeam() });

    expect(optionTexts(draft, '#post-slots')).toEqual(['1', '2', '3']);
    expect(optionTexts(published, '#post-slots')).toEqual(['0', '1', '2', '3']);
  });

  it('moves a draft saved with no open slots up to one', async () => {
    const wrapper = mountModal({ team: ledTeam({ status: 'draft', slotsOpen: 0 }) });

    expect(wrapper.find('#post-slots').element.value).toBe('1');
    await button(wrapper, 'Publish post').trigger('click');

    expect(submitted(wrapper)).toMatchObject({ status: 'open', openSlots: 1 });
  });
});

function buttonTexts(wrapper) {
  return wrapper.findAll('.modal-footer button').map((candidate) => candidate.text());
}

describe('CreateTeamModal', () => {
  it.each([
    ['a name', { name: '   ' }, LISTINGS, 'Give your team a name.'],
    ['a pitch', { pitch: '  ' }, LISTINGS, 'Write a short pitch for your team.'],
    ['an event name', {}, [], 'Type in the name of the hackathon or competition.'],
  ])('asks for %s before posting', async (label, values, events, message) => {
    const wrapper = mountModal({ events });

    await fill(wrapper, values);
    await button(wrapper, 'Publish post').trigger('click');

    expect(wrapper.text()).toContain(message);
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('shows the server error', () => {
    const wrapper = mountModal({ error: 'Invalid slots configuration' });

    expect(wrapper.text()).toContain('Invalid slots configuration');
  });

  it('starts on Other with its inputs when there are no listings', () => {
    const wrapper = mountModal({ events: [] });

    expect(optionTexts(wrapper, '#post-event')).toEqual(['Other event (not on the list)']);
    expect(wrapper.find('#post-event').element.value).toBe('other');
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Event location"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Closing date"]').exists()).toBe(true);
  });

  it('emits a draft or a published post', async () => {
    const wrapper = mountModal({ suggestions: ['Figma'] });

    await fill(wrapper);
    await wrapper.find('#post-size').setValue(4);
    await wrapper.find('#post-slots').setValue(3);
    await wrapper.findAll('[aria-pressed]').find((chip) => chip.text() === 'Figma').trigger('click');
    await wrapper.findAll('[aria-pressed]').find((chip) => chip.text() === 'UI/UX designer').trigger('click');
    await wrapper.find('[aria-label="Role for open spot 2"]').setValue('  Backend dev ');
    await wrapper.find('[aria-label="Accept requests automatically"]').setValue(true);
    await button(wrapper, 'Save draft').trigger('click');
    await button(wrapper, 'Publish post').trigger('click');

    const post = {
      name: 'Byte Me',
      teamSize: 4,
      openSlots: 3,
      pitch: 'We ship.',
      skills: ['Figma'],
      openRoles: ['UI/UX designer', 'Backend dev'],
      autoAccept: true,
      opportunity: LISTINGS[0],
    };
    expect(wrapper.emitted('submit')).toEqual([
      [{ ...post, status: 'draft' }],
      [{ ...post, status: 'open' }],
    ]);
  });

  it('sends the typed event when there is none to pick', async () => {
    const wrapper = mountModal({ events: [] });

    await fill(wrapper);
    await wrapper.find('[aria-label="Event name"]').setValue('Hack&Roll');
    await wrapper.find('[aria-label="Event location"]').setValue('NUS');
    await wrapper.find('[aria-label="Closing date"]').setValue('2026-11-20');
    await button(wrapper, 'Publish post').trigger('click');

    expect(eventPart(submitted(wrapper))).toStrictEqual({
      opportunityId: null,
      eventName: 'Hack&Roll',
      eventLocation: 'NUS',
      closesAt: '2026-11-20',
    });
  });

  it('keeps open slots within the team size', async () => {
    const wrapper = mountModal();

    await wrapper.find('#post-size').setValue(6);
    await wrapper.find('#post-slots').setValue(5);
    await wrapper.find('#post-size').setValue(3);

    expect(optionTexts(wrapper, '#post-slots')).toEqual(['1', '2']);
    expect(wrapper.find('#post-slots').element.value).toBe('2');
  });

  it('offers delete only when editing a published post', async () => {
    expect(buttonTexts(mountModal())).toEqual(['Save draft', 'Cancel', 'Publish post']);
    expect(buttonTexts(mountModal({ team: ledTeam({ status: 'draft' }) }))).toEqual([
      'Save draft',
      'Cancel',
      'Publish post',
    ]);

    const wrapper = mountModal({ team: ledTeam() });
    expect(buttonTexts(wrapper)).toEqual(['Delete post', 'Cancel', 'Save changes']);
    expect(wrapper.find('h2').text()).toBe('Edit team post');

    await button(wrapper, 'Delete post').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });

  it('fills the fields from the post being edited', () => {
    const wrapper = mountModal({ team: ledTeam() });

    expect(wrapper.find('#post-name').element.value).toBe('Night Owls');
    expect(wrapper.find('#post-size').element.value).toBe('4');
    expect(wrapper.find('#post-slots').element.value).toBe('2');
    expect(wrapper.find('#post-pitch').element.value).toBe('We ship a working demo every weekend.');
    expect(wrapper.findAll('.skill-input .badge').map((chip) => chip.text())).toEqual([
      'Vue.js',
      'Figma',
    ]);
  });

  it('has one role box per open spot and fills them from the role ideas', async () => {
    const wrapper = mountModal();
    const boxes = () => wrapper.findAll('[aria-label^="Role for open spot"]').map((box) => box.element.value);
    const idea = (text) => wrapper.findAll('[aria-pressed]').find((chip) => chip.text() === text);

    await wrapper.find('#post-slots').setValue(2);
    expect(boxes()).toEqual(['', '']);
    await idea('Frontend developer').trigger('click');
    await idea('Data / ML').trigger('click');
    expect(boxes()).toEqual(['Frontend developer', 'Data / ML']);
    expect(idea('Pitch & business').attributes('disabled')).toBeDefined();

    await idea('Frontend developer').trigger('click');
    expect(boxes()).toEqual(['', 'Data / ML']);
    await wrapper.find('#post-slots').setValue(1);
    expect(boxes()).toEqual(['']);
  });
});
