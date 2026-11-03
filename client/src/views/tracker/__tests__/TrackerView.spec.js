import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import TrackerView from '@/views/tracker/TrackerView.vue';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
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

function addModal(wrapper) {
  return wrapper.find('[aria-labelledby="add-application-title"]');
}

function detailModal(wrapper) {
  return wrapper.find('[aria-labelledby="application-modal-title"]');
}

async function fillAddForm(modal) {
  await modal.find('#add-title').setValue('Product Intern');
  await modal.find('#add-organisation').setValue('Carousell');
  await modal.find('#add-url').setValue('carousell.com/careers');
  await modal.find('#add-deadline').setValue('2026-11-10');
  await modal.find('#add-notes').setValue('Referred by Sam.');
}

describe('TrackerView', () => {
  it('groups cards by stage and counts what is due this week', async () => {
    const wrapper = await mountTracker();

    expect(cardTitles(wrapper, 'Saved')).toEqual(['Frontend Intern']);
    expect(cardTitles(wrapper, 'Applied')).toEqual(['Hack&Roll']);
    expect(cardTitles(wrapper, 'Interview')).toEqual(['Data Analyst']);
    expect(cardTitles(wrapper, 'Offer')).toEqual([]);
    expect(cardTitles(wrapper, 'Rejected')).toEqual(['Backend Engineer']);
    expect(wrapper.text()).toContain('4 applications · 1 due this week');
  });

  it('shows a failed load as an alert', async () => {
    mock.onGet('/application').reply(500);

    const wrapper = await mountTracker();

    expect(wrapper.find('[role="alert"]').text()).toBe(
      'There was an error: Request failed with status code 500',
    );
  });

  it('filters by keyword, type and deadline and hides rejected with its column', async () => {
    const wrapper = await mountTracker();
    const search = wrapper.find('input[aria-label="Search applications"]');

    await search.setValue('grab');
    expect(cardTitles(wrapper)).toEqual(['Data Analyst']);
    await search.setValue('');

    await wrapper.find('select[aria-label="Type"]').setValue('hackathon');
    expect(cardTitles(wrapper)).toEqual(['Hack&Roll']);
    await button(wrapper, 'Clear all').trigger('click');
    expect(cardTitles(wrapper)).toHaveLength(4);

    await wrapper.find('select[aria-label="Deadline"]').setValue('week');
    expect(cardTitles(wrapper)).toEqual(['Frontend Intern']);
    await wrapper.find('select[aria-label="Deadline"]').setValue('overdue');
    expect(cardTitles(wrapper)).toEqual(['Backend Engineer']);
    await button(wrapper, 'Clear all').trigger('click');

    await button(wrapper, 'Hide rejected').trigger('click');
    expect(column(wrapper, 'Rejected').exists()).toBe(false);
    expect(wrapper.findAll('.kanban-column')).toHaveLength(4);
    expect(wrapper.text()).toContain('3 applications · 1 due this week');
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
    expect(cardTitles(wrapper, 'Applied')).toEqual(['Frontend Intern', 'Hack&Roll']);
    expect(cardTitles(wrapper, 'Saved')).toEqual([]);
    expect(detailModal(wrapper).exists()).toBe(false);
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
    expect(cardTitles(wrapper, 'Applied')).toEqual(['Hack&Roll', 'Product Intern']);
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
    expect(cardTitles(wrapper)).toHaveLength(4);

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
