import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
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
});
