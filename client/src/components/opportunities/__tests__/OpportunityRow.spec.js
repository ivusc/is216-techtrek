import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityRow from '@/components/opportunities/OpportunityRow.vue';
import { HACKATHONS } from '@/__tests__/fixtures/opportunities';
import { NOW } from '@/__tests__/fixtures/applications';

beforeEach(() => vi.setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe('OpportunityRow', () => {
  it.each([
    ['$2,000 in prizes', '$2,000 in prizes'],
    ['Over $1,000 in Prizes', 'Over $1,000 in Prizes'],
    ['$5,000 Prize pool', '$5,000 Prize pool'],
    ['$500 grand prize', '$500 grand prize'],
    ['$5,000', '$5,000 prizes'],
  ])('says prizes once for a prize of %s', (prize, shown) => {
    const row = mount(OpportunityRow, {
      props: { item: { ...HACKATHONS[0], prize } },
      global: { stubs: { RouterLink: true } },
    });

    expect(row.find('.bi-trophy').element.parentElement.textContent.trim()).toBe(shown);
  });
});
