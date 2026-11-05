import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import DeadlinePrompt from '@/components/opportunities/DeadlinePrompt.vue';
import { useOpportunityStore } from '@/store/opportunity';
import { useApplicationsStore } from '@/store/applications';
import { jobs } from '@/__tests__/fixtures/opportunities';

const mock = new MockAdapter(serverAPI);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T02:00:00.000Z')); // 5 Nov, 10am in Singapore
});

afterEach(() => {
  mock.reset();
  vi.useRealTimers();
});

function open() {
  const [job] = jobs(1);
  useOpportunityStore().deadlinePrompt = { applicationId: 'a9', item: job };
  return mount(DeadlinePrompt);
}

describe('DeadlinePrompt', () => {
  it('asks when the tracked job closes, starting on two weeks from today', () => {
    const wrapper = open();

    expect(wrapper.text()).toContain('When do applications close?');
    expect(wrapper.text()).toContain('Frontend Intern · Acme is tracked.');
    expect(wrapper.find('#deadline-date').element.value).toBe('2026-11-19');
    expect(wrapper.find('[aria-pressed="true"]').text()).toBe('In 2 weeks');
  });

  it('saves the end of the picked day and updates the Tracker copy', async () => {
    mock.onPatch('/application/a9').reply((config) => [200, { _id: 'a9', status: 'saved', ...JSON.parse(config.data) }]);
    useApplicationsStore().applications = [{ _id: 'a9', status: 'saved', deadline: null }];
    const wrapper = open();

    await wrapper.findAll('[role="group"] button').find((b) => b.text() === 'In 1 week').trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Add deadline').trigger('click');
    await flushPromises();

    const sent = new Date(JSON.parse(mock.history.patch[0].data).deadline);
    expect(sent.toISOString()).toBe(new Date('2026-11-12T23:59:59').toISOString());
    expect(useApplicationsStore().applications[0].deadline).toBe(sent.toISOString());
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('can be skipped', async () => {
    const wrapper = open();

    await wrapper.findAll('button').find((b) => b.text() === 'Skip').trigger('click');

    expect(useOpportunityStore().deadlinePrompt).toBeNull();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });
});
