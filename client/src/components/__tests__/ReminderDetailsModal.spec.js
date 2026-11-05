import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@/services/trackerService', () => ({ fetchApplicationService: vi.fn() }));

import { fetchApplicationService } from '@/services/trackerService';
import ReminderDetailsModal from '@/components/ReminderDetailsModal.vue';

const RouterLink = { props: ['to'], emits: ['click'], template: '<a :data-to="JSON.stringify(to)" @click="$emit(\'click\')"><slot /></a>' };

const inHours = (hours) => new Date(Date.now() + hours * 3600000).toISOString();

const REMINDER = {
  _id: 'r1',
  type: 'deadline-reminder',
  applicationId: 'a1',
  title: 'Frontend Intern',
  organisation: 'Acme',
  deadline: inHours(20),
  daysLeft: 1,
  createdAt: new Date().toISOString(),
};

async function open(notification = REMINDER) {
  const wrapper = mount(ReminderDetailsModal, { props: { notification }, global: { stubs: { RouterLink } }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('ReminderDetailsModal', () => {
  it('shows what is due, when, how long is left, and where it is in the tracker', async () => {
    fetchApplicationService.mockResolvedValue({
      _id: 'a1',
      status: 'applied',
      notes: 'Ask Wei about the take-home',
      deadline: REMINDER.deadline,
      opportunityId: { title: 'Frontend Intern', organisation: 'Acme', type: 'internship', location: 'Singapore', url: 'https://acme.test/jobs/1' },
    });
    const wrapper = await open();

    expect(fetchApplicationService).toHaveBeenCalledWith('a1');
    expect(wrapper.find('#reminder-modal-title').text()).toBe('Frontend Intern');
    expect(wrapper.find('.time-left').text()).toBe('in 19 hours');
    const details = wrapper.find('dl').text();
    expect(details).toContain('Applied');
    expect(details).toContain('Singapore');
    expect(details).toContain('Ask Wei about the take-home');
    expect(details).toContain('1 day before');
    expect(wrapper.find('a[href="https://acme.test/jobs/1"]').exists()).toBe(true);
    const trackerButton = wrapper.findAll('a').find((link) => link.text() === 'Open in Tracker');
    expect(JSON.parse(trackerButton.attributes('data-to'))).toEqual({ path: '/tracker', query: { open: 'a1' } });
  });

  it('uses the latest deadline from the tracker if it moved since the reminder', async () => {
    fetchApplicationService.mockResolvedValue({ _id: 'a1', status: 'saved', deadline: inHours(80), opportunityId: { title: 'Frontend Intern', organisation: 'Acme' } });
    const wrapper = await open();

    expect(wrapper.find('.time-left').text()).toBe('in 3 days');
  });

  it('says so when the application was deleted from the tracker', async () => {
    fetchApplicationService.mockRejectedValue({ response: { status: 404 } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = await open();

    expect(wrapper.text()).toContain('no longer in your tracker');
    // still shows what the reminder was about
    expect(wrapper.find('#reminder-modal-title').text()).toBe('Frontend Intern');
  });

  it('closes from the X and from Esc', async () => {
    fetchApplicationService.mockResolvedValue({ _id: 'a1', status: 'saved', opportunityId: {} });
    const wrapper = await open();

    await wrapper.find('.btn-close').trigger('click');
    await wrapper.find('.modal').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
