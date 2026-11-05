import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import TrackerView from '@/views/tracker/TrackerView.vue';
import { useApplicationsStore } from '@/store/applications';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

const route = vi.hoisted(() => ({ query: {} }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}));

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  route.query = {};
  setActivePinia(createPinia());
  vi.setSystemTime(new Date(NOW));
  mock.onGet('/application').reply(200, applications());
});

afterEach(() => {
  mock.reset();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

async function mountTracker() {
  const wrapper = mount(TrackerView, { global: { stubs: { RouterLink: true } } });
  await flushPromises();
  return wrapper;
}

function column(wrapper, label) {
  return wrapper.find(`section[aria-label="${label}"]`);
}

function cardTitles(wrapper, label) {
  const scope = label ? column(wrapper, label) : wrapper;
  return scope.findAll('.kanban-card > p').map((title) => title.text());
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

function boardTab(wrapper, label) {
  return wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label));
}

function addModal(wrapper) {
  return wrapper.find('[aria-labelledby="add-application-title"]');
}

function detailModal(wrapper) {
  return wrapper.find('[aria-labelledby="application-modal-title"]');
}

function offerModal(wrapper) {
  return wrapper.find('[aria-labelledby="offer-modal-title"]');
}

async function moveDataAnalystToOffer(wrapper) {
  mock.onPatch('/application/a3').reply(200, { ...applications()[2], status: 'offer' });
  mock.onPost('/application/a3/review').reply((config) => [
    201,
    {
      ...applications()[2],
      status: 'offer',
      review: { ...JSON.parse(config.data), createdAt: NOW },
    },
  ]);
  await button(column(wrapper, 'Interview').find('.dropdown-menu'), 'Offer').trigger('click');
  await flushPromises();
}

async function fillAddForm(modal) {
  await modal.find('#add-title').setValue('Product Intern');
  await modal.find('#add-organisation').setValue('Carousell');
  await modal.find('#add-url').setValue('carousell.com/careers');
  await modal.find('#add-deadline').setValue('2026-11-10');
  await modal.find('#add-notes').setValue('Referred by Sam.');
}

describe('TrackerView', () => {
  it('groups cards by stage on separate job and hackathon boards and counts what is due this week', async () => {
    const wrapper = await mountTracker();

    expect(boardTab(wrapper, 'Jobs').attributes('aria-selected')).toBe('true');
    expect(boardTab(wrapper, 'Jobs').text()).toContain('3');
    expect(boardTab(wrapper, 'Hackathons').text()).toContain('1');
    expect(cardTitles(wrapper, 'Saved')).toEqual(['Frontend Intern']);
    expect(cardTitles(wrapper, 'Applied')).toEqual([]);
    expect(cardTitles(wrapper, 'Interview')).toEqual(['Data Analyst']);
    expect(cardTitles(wrapper, 'Offer')).toEqual([]);
    expect(cardTitles(wrapper, 'Rejected')).toEqual(['Backend Engineer']);
    expect(wrapper.text()).toContain('3 applications · 1 due this week');

    await boardTab(wrapper, 'Hackathons').trigger('click');

    expect(
      wrapper.findAll('.kanban-column').map((section) => section.attributes('aria-label')),
    ).toEqual(['Saved', 'Registered', 'Team formed', 'Submitted', 'Results']);
    expect(cardTitles(wrapper, 'Registered')).toEqual(['Hack&Roll']);
    expect(wrapper.text()).toContain('1 event · 0 due this week');
    expect(button(wrapper, 'Add event')).toBeDefined();
  });

  it('opens the hackathon board from the address', async () => {
    route.query = { board: 'hackathons' };

    const wrapper = await mountTracker();

    expect(boardTab(wrapper, 'Hackathons').attributes('aria-selected')).toBe('true');
    expect(cardTitles(wrapper)).toEqual(['Hack&Roll']);
  });

  it('opens a card from a link, on the board it belongs to, and forgets the link when closed', async () => {
    route.query = { open: 'a2' };

    const wrapper = await mountTracker();

    expect(boardTab(wrapper, 'Hackathons').attributes('aria-selected')).toBe('true');
    expect(detailModal(wrapper).text()).toContain('Hack&Roll');
    await detailModal(wrapper).find('[aria-label="Close"]').trigger('click');
    expect(router.replace).toHaveBeenCalledWith({ query: {} });
  });

  it("says so when a link's application is gone", async () => {
    route.query = { open: 'deleted-one' };

    const wrapper = await mountTracker();

    expect(wrapper.text()).toContain("That application isn't in your tracker any more.");
  });

  it('shows a failed load as an alert', async () => {
    mock.onGet('/application').reply(500);

    const wrapper = await mountTracker();

    expect(wrapper.find('[role="alert"]').text()).toBe(
      'Applications could not be loaded right now. Try again in a moment.',
    );
  });

  it('filters by keyword, type and deadline and hides rejected with its column', async () => {
    const wrapper = await mountTracker();
    const search = wrapper.find('input[aria-label="Search applications"]');

    await search.setValue('grab');
    expect(cardTitles(wrapper)).toEqual(['Data Analyst']);
    await search.setValue('');

    const typeSelect = wrapper.find('select[aria-label="Type"]');
    expect(typeSelect.findAll('option').map((option) => option.element.value)).toEqual([
      '',
      'job',
      'internship',
    ]);
    await typeSelect.setValue('internship');
    expect(cardTitles(wrapper)).toEqual(['Frontend Intern']);
    await button(wrapper, 'Clear all').trigger('click');
    expect(cardTitles(wrapper)).toHaveLength(3);

    await wrapper.find('select[aria-label="Deadline"]').setValue('week');
    expect(cardTitles(wrapper)).toEqual(['Frontend Intern']);
    await wrapper.find('select[aria-label="Deadline"]').setValue('overdue');
    expect(cardTitles(wrapper)).toEqual(['Backend Engineer']);
    await button(wrapper, 'Clear all').trigger('click');

    await button(wrapper, 'Hide rejected').trigger('click');
    expect(column(wrapper, 'Rejected').exists()).toBe(false);
    expect(wrapper.findAll('.kanban-column')).toHaveLength(4);
    expect(wrapper.text()).toContain('2 applications · 1 due this week');
  });

  it('clears a type filter and hides Hide rejected when switching to the hackathon board', async () => {
    const wrapper = await mountTracker();

    await wrapper.find('select[aria-label="Type"]').setValue('internship');
    await boardTab(wrapper, 'Hackathons').trigger('click');

    expect(wrapper.find('select[aria-label="Type"]').element.value).toBe('');
    expect(cardTitles(wrapper)).toEqual(['Hack&Roll']);
    expect(button(wrapper, 'Hide rejected')).toBeUndefined();
  });

  it('moves a card with the Move-to menu', async () => {
    mock
      .onPatch('/application/a1')
      .reply((config) => [200, { ...applications()[0], ...JSON.parse(config.data) }]);
    const wrapper = await mountTracker();

    const menu = column(wrapper, 'Saved').find('.dropdown-menu');
    await button(menu, 'Applied').trigger('click');
    await flushPromises();

    expect(mock.history.patch[0].url).toBe('/application/a1');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'applied' });
    expect(cardTitles(wrapper, 'Applied')).toEqual(['Frontend Intern']);
    expect(cardTitles(wrapper, 'Saved')).toEqual([]);
    expect(detailModal(wrapper).exists()).toBe(false);
  });

  it('congratulates a move into Offer and shares the tips from there', async () => {
    const wrapper = await mountTracker();

    await moveDataAnalystToOffer(wrapper);

    expect(offerModal(wrapper).find('h2').text()).toBe('Congratulations on your offer from Grab!');
    await button(offerModal(wrapper), 'Share your interview tips').trigger('click');
    expect(offerModal(wrapper).find('h2').text()).toBe('Share your interview tips');
    await offerModal(wrapper).find('#offer-tips').setValue('Know the product.');
    await offerModal(wrapper).find('form').trigger('submit');
    await flushPromises();

    expect(mock.history.post[0].url).toBe('/application/a3/review');
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      difficulty: 3,
      tips: 'Know the product.',
    });
    expect(offerModal(wrapper).exists()).toBe(false);
    expect(wrapper.find('.thanks-toast').text()).toContain('Thank you for sharing!');
    await column(wrapper, 'Offer').find('.kanban-card').trigger('click');
    expect(detailModal(wrapper).find('.tips-card').text()).toContain('Know the product.');
  });

  it('lets me edit my tips from the job and shows the new ones straight after', async () => {
    const wrapper = await mountTracker();
    await moveDataAnalystToOffer(wrapper);
    await button(offerModal(wrapper), 'Share your interview tips').trigger('click');
    await offerModal(wrapper).find('#offer-tips').setValue('Know the product.');
    await offerModal(wrapper).find('form').trigger('submit');
    await flushPromises();
    mock.onPut('/application/a3/review').reply((config) => [
      200,
      {
        ...applications()[2],
        status: 'offer',
        review: { ...JSON.parse(config.data), createdAt: NOW, updatedAt: NOW },
      },
    ]);

    await column(wrapper, 'Offer').find('.kanban-card').trigger('click');
    await button(detailModal(wrapper), 'Edit tips').trigger('click');
    expect(offerModal(wrapper).find('h2').text()).toBe('Edit your interview tips');
    expect(offerModal(wrapper).find('#offer-tips').element.value).toBe('Know the product.');
    await offerModal(wrapper).find('#offer-tips').setValue('Know the product and the team.');
    await offerModal(wrapper).find('form').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.put[0].data)).toMatchObject({ tips: 'Know the product and the team.' });
    expect(offerModal(wrapper).exists()).toBe(false);
    expect(detailModal(wrapper).find('.tips-card').text()).toContain('Know the product and the team.');
    expect(detailModal(wrapper).find('.tips-card').text()).toContain('Tips saved');
    expect(wrapper.find('.thanks-toast').text()).toContain('Tips updated, thank you!');
  });

  it('takes my tips down from the job after I confirm', async () => {
    const wrapper = await mountTracker();
    await moveDataAnalystToOffer(wrapper);
    await button(offerModal(wrapper), 'Share your interview tips').trigger('click');
    await offerModal(wrapper).find('#offer-tips').setValue('Know the product.');
    await offerModal(wrapper).find('form').trigger('submit');
    await flushPromises();
    mock.onDelete('/application/a3/review').reply(200, { ...applications()[2], status: 'offer' });

    await column(wrapper, 'Offer').find('.kanban-card').trigger('click');
    await button(detailModal(wrapper), 'Delete').trigger('click');
    await button(detailModal(wrapper), 'Delete tips').trigger('click');
    await flushPromises();

    expect(mock.history.delete[0].url).toBe('/application/a3/review');
    expect(detailModal(wrapper).find('.tips-card').exists()).toBe(false);
    expect(button(detailModal(wrapper), 'Share your interview tips')).toBeDefined();
  });

  it('leaves a way to share tips in the detail modal after Maybe later', async () => {
    const wrapper = await mountTracker();

    await moveDataAnalystToOffer(wrapper);
    await button(offerModal(wrapper), 'Maybe later').trigger('click');

    expect(offerModal(wrapper).exists()).toBe(false);
    await column(wrapper, 'Offer').find('.kanban-card').trigger('click');
    await button(detailModal(wrapper), 'Share your interview tips').trigger('click');

    expect(detailModal(wrapper).exists()).toBe(false);
    expect(offerModal(wrapper).find('h2').text()).toBe('Share your interview tips');
  });

  it('drops an unanswered congratulations when the tracker is left', async () => {
    const wrapper = await mountTracker();
    await moveDataAnalystToOffer(wrapper);

    wrapper.unmount();

    expect(useApplicationsStore().celebration).toBeNull();
  });

  it('dropping a card on its own column does nothing', async () => {
    const wrapper = await mountTracker();

    await column(wrapper, 'Saved').trigger('drop', { dataTransfer: { getData: () => 'a1' } });
    await flushPromises();

    expect(mock.history.patch).toHaveLength(0);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(column(wrapper, 'Saved').text()).toContain('Frontend Intern');
  });

  it('adds an application from a column and closes the modal', async () => {
    mock.onPost('/application').reply((config) => {
      const body = JSON.parse(config.data);
      return [
        201,
        {
          _id: 'a5',
          userId: 'u1',
          status: body.status,
          deadline: body.deadline,
          notes: body.notes,
          opportunityId: { _id: 'o5', ...body.opportunity },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ];
    });
    const wrapper = await mountTracker();

    await column(wrapper, 'Applied')
      .find('button[aria-label="Add application to Applied"]')
      .trigger('click');
    expect(addModal(wrapper).find('button[type="submit"]').text()).toBe('Add to Applied');
    await fillAddForm(addModal(wrapper));
    await addModal(wrapper).find('form').trigger('submit');
    await flushPromises();

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      opportunity: {
        source: 'manual',
        type: 'job',
        title: 'Product Intern',
        organisation: 'Carousell',
        url: 'https://carousell.com/careers',
      },
      status: 'applied',
      deadline: '2026-11-10T15:59:59.000Z',
      notes: 'Referred by Sam.',
    });
    expect(addModal(wrapper).exists()).toBe(false);
    expect(cardTitles(wrapper, 'Applied')).toEqual(['Product Intern']);
    expect(mock.history.get).toHaveLength(1);
  });

  it('keeps the modal open and shows the reason when adding fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.onPost('/application').reply(409, { error: 'Application already exists' });
    const wrapper = await mountTracker();

    await button(wrapper, 'Add application').trigger('click');
    await fillAddForm(addModal(wrapper));
    await addModal(wrapper).find('form').trigger('submit');
    await flushPromises();

    expect(addModal(wrapper).find('[role="alert"]').text()).toBe(
      'Could not add the application: Application already exists',
    );
    expect(cardTitles(wrapper)).toHaveLength(3);

    await button(addModal(wrapper), 'Cancel').trigger('click');
    await button(wrapper, 'Add application').trigger('click');
    expect(addModal(wrapper).find('[role="alert"]').exists()).toBe(false);
  });

  it('opens the detail modal, saves changes and deletes', async () => {
    mock
      .onPatch('/application/a3')
      .reply((config) => [200, { ...applications()[2], ...JSON.parse(config.data) }]);
    mock.onDelete('/application/a3').reply(204);
    const wrapper = await mountTracker();

    await column(wrapper, 'Interview').find('.kanban-card').trigger('click');
    expect(detailModal(wrapper).find('h2').text()).toBe('Data Analyst');
    await detailModal(wrapper).find('#application-stage').setValue('offer');
    await detailModal(wrapper).find('#application-notes').setValue('Bring the portfolio.');
    await button(detailModal(wrapper), 'Save changes').trigger('click');
    await flushPromises();

    expect(mock.history.patch[0].url).toBe('/application/a3');
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      status: 'offer',
      notes: 'Bring the portfolio.',
      checklist: [
        { label: 'Research the company', done: true },
        { label: 'Prepare questions', done: false },
      ],
      interviewAt: '2026-11-04T06:00:00.000Z',
      deadline: null,
      result: null,
    });
    expect(detailModal(wrapper).exists()).toBe(false);
    expect(cardTitles(wrapper, 'Offer')).toEqual(['Data Analyst']);

    await column(wrapper, 'Offer').find('.kanban-card').trigger('click');
    await button(detailModal(wrapper), 'Delete').trigger('click');
    await flushPromises();

    expect(mock.history.delete[0].url).toBe('/application/a3');
    expect(detailModal(wrapper).exists()).toBe(false);
    expect(cardTitles(wrapper)).not.toContain('Data Analyst');
  });

  it('exports an .ics', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:techtrek');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const wrapper = await mountTracker();

    await button(wrapper, 'Calendar').trigger('click');
    await button(wrapper, 'Export to Google Calendar (.ics)').trigger('click');

    const [file] = URL.createObjectURL.mock.calls[0];
    const text = await file.text();
    expect(file.type).toBe('text/calendar');
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(text).toContain('SUMMARY:Interview: Data Analyst');
    const [link] = click.mock.contexts;
    expect(link.download).toBe('techtrek-applications.ics');
    expect(link.href).toBe('blob:techtrek');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:techtrek');
  });

  it('switches to the calendar view', async () => {
    const wrapper = await mountTracker();

    await button(wrapper, 'Calendar').trigger('click');

    expect(wrapper.text()).toContain('Every deadline, interview and hackathon in one month view.');
    expect(wrapper.find('#calendar-title').text()).toBe('November 2026');
    expect(wrapper.find('.kanban-board').exists()).toBe(false);

    await button(wrapper, 'Board').trigger('click');

    expect(wrapper.text()).toContain('Drag cards between stages. Deadlines sync to your calendar.');
    expect(wrapper.findAll('.kanban-column')).toHaveLength(5);
  });
});
