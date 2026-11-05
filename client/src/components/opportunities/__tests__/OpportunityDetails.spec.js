import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

vi.mock('@/services/opportunityService', () => ({ fetchTipsForOpportunity: vi.fn(async () => []) }));

import { fetchTipsForOpportunity } from '@/services/opportunityService';
import OpportunityDetails from '@/components/opportunities/OpportunityDetails.vue';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';

enableAutoUnmount(afterEach);

function mountDetails(item, saved = false) {
  return mount(OpportunityDetails, { props: { item, saved } });
}

function infoBoxes(wrapper) {
  return wrapper.findAll('.details-info-box').map((box) => {
    const [label, value] = box.findAll('span.text-caption, span.fw-semibold');
    return [label.text(), value.text()];
  });
}

describe('OpportunityDetails', () => {
  it('falls back to Not listed', () => {
    const details = mountDetails({
      source: 'manual',
      type: 'job',
      title: 'Mystery role',
      organisation: 'Acme',
    });

    expect(infoBoxes(details)).toEqual([
      ['Posted on', 'Not listed'],
      ['Monthly allowance', 'Not listed'],
      ['Job type', 'Not listed'],
      ['Location', 'Not listed'],
    ]);
  });

  it('fills the boxes from a hackathon and marks an estimated salary', () => {
    const hackathon = infoBoxes(mountDetails(HACKATHONS[2]));
    const job = infoBoxes(mountDetails(jobs(2)[1]));

    expect(hackathon[0][0]).toBe('Application deadline');
    expect(hackathon.slice(1)).toEqual([
      ['Prize pool', '$10,000 in prizes'],
      ['Dates', 'Oct 24 - Nov 30, 2026'],
      ['Location', 'Online'],
    ]);
    expect(job[1]).toEqual(['Monthly allowance', 'S$4,100 (estimated by Adzuna)']);
    expect(job[2]).toEqual(['Job type', 'Full time · Permanent']);
  });

  it('emits close from the backdrop and the close button, and toggle-save from Track', async () => {
    const details = mountDetails(HACKATHONS[0]);

    await details.find('.offcanvas-backdrop').trigger('click');
    await details.find('button[aria-label="Close"]').trigger('click');
    const save = details.findAll('button').find((button) => button.text() === 'Track');
    await save.trigger('click');

    expect(details.emitted('close')).toHaveLength(2);
    expect(details.emitted('toggle-save')).toHaveLength(1);

    await details.setProps({ saved: true });
    expect(save.text()).toBe('Tracked');
  });

  it('shows the job roles as tags', () => {
    const [job] = jobs(1);
    const wrapper = mountDetails({ ...job, roles: [{ key: 'data', label: 'Data' }] });

    expect(wrapper.findAll('.role-tag').map((tag) => tag.text())).toEqual(['Data']);
  });

  it('shows senior tips for the company on jobs, and leaves them off hackathons', async () => {
    const [job] = jobs(1);
    fetchTipsForOpportunity.mockResolvedValueOnce([
      { title: job.title, sameRole: true, difficulty: 4, rounds: 'OA, technical', tips: 'Revise graphs.', createdAt: '2026-06-01T00:00:00Z' },
    ]);
    const wrapper = mountDetails(job);
    await flushPromises();

    expect(fetchTipsForOpportunity).toHaveBeenCalledWith(job.organisation, job.title);
    const tips = wrapper.find('[aria-labelledby="opportunity-tips-title"]');
    expect(tips.text()).toContain('Revise graphs.');
    expect(tips.text()).toContain('This role');
    expect(tips.text()).toContain('Difficulty 4/5 · Hard');

    expect(mountDetails(HACKATHONS[0]).find('#opportunity-tips-title').exists()).toBe(false);
  });

  it('says so when the company has no tips yet', async () => {
    const [job] = jobs(1);
    const wrapper = mountDetails(job);
    await flushPromises();

    expect(wrapper.find('[aria-labelledby="opportunity-tips-title"]').text()).toContain(`No tips for ${job.organisation} yet`);
  });
});
