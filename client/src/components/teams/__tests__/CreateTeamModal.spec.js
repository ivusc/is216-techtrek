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

const EVENT_FIELDS = ['opportunityId', 'eventName', 'eventLocation', 'closesAt'];

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
      'Other event (type it in)',
    ]);
    expect(wrapper.find('#post-event').element.value).toBe('devpost-201');
    expect(wrapper.find('[aria-label="Event name"]').exists()).toBe(false);
  });

  it('sends the chosen listing as the event', async () => {
    const wrapper = mountModal();

    await fill(wrapper);
    await button(wrapper, 'Publish post').trigger('click');

    expect(submitted(wrapper).status).toBe('open');
    expect(eventPart(submitted(wrapper))).toStrictEqual({
      opportunityId: null,
      eventName: 'Build for Good',
      eventLocation: 'Singapore',
      closesAt: '2026-11-30T23:59:59.000Z',
    });
  });

  it('sends the location text of a listing whose location is an object', async () => {
    const wrapper = mountModal();

    await fill(wrapper);
    await wrapper.find('#post-event').setValue('devpost-202');
    await button(wrapper, 'Publish post').trigger('click');

    expect(eventPart(submitted(wrapper))).toStrictEqual({
      opportunityId: null,
      eventName: 'Code for Climate',
      eventLocation: 'Online',
      closesAt: null,
    });
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
      {
        opportunityId: null,
        eventName: 'Build for Good',
        eventLocation: 'Singapore',
        closesAt: '2026-11-30T23:59:59.000Z',
      },
    ],
  ])('sends only what an edit of %s changes', async (label, team, [field, value], sent) => {
    const wrapper = mountModal({ team });

    await wrapper.find(field).setValue(value);
    await button(wrapper, 'Save changes').trigger('click');

    expect(eventPart(submitted(wrapper))).toStrictEqual(sent);
  });
});
