import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityCard from '@/components/opportunities/OpportunityCard.vue';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';
import { NOW } from '@/__tests__/fixtures/applications';

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

function mountCard(item, saved = false, teamCount = 0) {
  return mount(OpportunityCard, {
    props: { item, saved, teamCount },
    global: { stubs: { RouterLink: true } },
  });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text().includes(text));
}

describe('OpportunityCard', () => {
  it('shows urgency, platform, pay and the Find team button only for hackathons', () => {
    const hackathon = mountCard(HACKATHONS[0]);
    const [internship, estimated] = jobs(2).map((job) => mountCard(job));

    expect(hackathon.text()).toContain('3 days left');
    expect(hackathon.text()).toContain('Register by');
    expect(hackathon.text()).toContain('$2,000 in prizes');
    expect(hackathon.text()).toContain('via Devpost');
    expect(button(hackathon, 'Find team').attributes('aria-label')).toBe('Find team');

    expect(internship.text()).toContain('Posted today');
    expect(internship.text()).toContain('S$2,000/mo');
    expect(internship.text()).toContain('via Adzuna');
    expect(internship.text()).not.toContain('days left');
    expect(internship.text()).not.toContain('est.');
    expect(button(internship, 'Find team')).toBeUndefined();

    expect(estimated.text()).toContain('S$4,100/mo');
    expect(estimated.text()).toContain('est.');
  });

  it.each([
    ['$2,000 in prizes', '$2,000 in prizes'],
    ['Over $1,000 in Prizes', 'Over $1,000 in Prizes'],
    ['$5,000 Prize pool', '$5,000 Prize pool'],
    ['$500 grand prize', '$500 grand prize'],
    ['$5,000', '$5,000 prizes'],
  ])('says prizes once for a prize of %s', (prize, shown) => {
    const card = mountCard({ ...HACKATHONS[0], prize });

    expect(card.find('.bi-trophy').element.parentElement.textContent.trim()).toBe(shown);
  });

  it('labels the Track button by saved state and emits toggle-save', async () => {
    const card = mountCard(jobs(1)[0]);

    expect(button(card, 'Track').text()).toBe('Track');

    await button(card, 'Track').trigger('click');
    expect(card.emitted('toggle-save')).toHaveLength(1);

    await card.setProps({ saved: true });
    expect(button(card, 'Track').text()).toBe('Tracked');
  });

  it('opens details from anywhere on the card, the Details button and Enter, but not from Track', async () => {
    const card = mountCard(jobs(1)[0]);

    await card.find('.opp-title').trigger('click');
    await button(card, 'Details').trigger('click');
    await card.find('.opp-card').trigger('keydown', { key: 'Enter' });
    await button(card, 'Track').trigger('click');

    expect(card.emitted('details')).toHaveLength(3);
    expect(card.find('.opp-card').attributes('aria-label')).toBe(
      'Open details for Frontend Intern',
    );
  });

  it('counts the open teams on Find team and emits find-team', async () => {
    const card = mountCard(HACKATHONS[0], false, 2);
    const findTeam = button(card, 'Find team');

    expect(findTeam.text()).toBe('Find team 2');
    expect(findTeam.attributes('aria-label')).toBe('Find team, 2 open');

    await findTeam.trigger('click');

    expect(card.emitted('find-team')).toHaveLength(1);
    expect(card.emitted('details')).toBeUndefined();
  });
});
