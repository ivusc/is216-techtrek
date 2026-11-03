import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityCard from '@/components/opportunities/OpportunityCard.vue';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';
import { NOW } from '@/__tests__/fixtures/applications';

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

function mountCard(item, saved = false) {
  return mount(OpportunityCard, {
    props: { item, saved },
    global: { stubs: { RouterLink: true } },
  });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('OpportunityCard', () => {
  it('shows urgency, platform, pay and the find-team link only for hackathons', () => {
    const hackathon = mountCard(HACKATHONS[0]);
    const [internship, estimated] = jobs(2).map((job) => mountCard(job));

    expect(hackathon.text()).toContain('3 days left');
    expect(hackathon.text()).toContain('Register by');
    expect(hackathon.text()).toContain('$2,000 in prizes');
    expect(hackathon.text()).toContain('via Devpost');
    expect(hackathon.find('router-link-stub[to="/teams"]').exists()).toBe(true);

    expect(internship.text()).toContain('Posted today');
    expect(internship.text()).toContain('S$2,000/mo');
    expect(internship.text()).toContain('via Adzuna');
    expect(internship.text()).not.toContain('days left');
    expect(internship.text()).not.toContain('est.');
    expect(internship.find('router-link-stub').exists()).toBe(false);

    expect(estimated.text()).toContain('S$4,100/mo');
    expect(estimated.text()).toContain('est.');
  });

  it('labels the Track button by saved state and emits toggle-save', async () => {
    const card = mountCard(jobs(1)[0]);

    expect(button(card, 'Track').text()).toBe('Track');

    await button(card, 'Track').trigger('click');
    expect(card.emitted('toggle-save')).toHaveLength(1);

    await card.setProps({ saved: true });
    expect(button(card, 'Track').text()).toBe('Tracked');
  });

  it('emits details from the title and the Details button', async () => {
    const card = mountCard(jobs(1)[0]);

    await card.find('[role="button"]').trigger('click');
    await button(card, 'Details').trigger('click');

    expect(card.emitted('details')).toHaveLength(2);
  });
});
