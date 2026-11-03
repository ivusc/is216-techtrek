import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OpportunityCardList from '@/components/opportunities/OpportunityCardList.vue';
import { HACKATHONS, jobs } from '@/__tests__/fixtures/opportunities';

const ITEMS = [HACKATHONS[0], jobs(1)[0]];
const SAVED = [{ key: 'adzuna-1', id: 'a1' }];

function mountList(props) {
  return mount(OpportunityCardList, {
    props: { items: ITEMS, savedItems: SAVED, ...props },
    global: { stubs: { RouterLink: true } },
  });
}

function trackLabels(wrapper) {
  return wrapper
    .findAll('button')
    .map((button) => button.text())
    .filter((text) => text.startsWith('Track'));
}

describe('OpportunityCardList', () => {
  it('renders cards in grid mode and rows in list mode', async () => {
    const list = mountList();

    expect(list.findAll('.opp-card')).toHaveLength(2);
    expect(list.findAll('.opp-row')).toHaveLength(0);
    expect(list.find('.row').classes()).toEqual(
      expect.arrayContaining(['row-cols-1', 'row-cols-md-2', 'row-cols-xl-3']),
    );
    expect(trackLabels(list)).toEqual(['Track', 'Tracked']);

    await list.setProps({ viewMode: 'list' });

    expect(list.findAll('.opp-row')).toHaveLength(2);
    expect(list.findAll('.opp-card')).toHaveLength(0);
    expect(trackLabels(list)).toEqual(['Track', 'Tracked']);
  });

  it('passes the clicked item up', async () => {
    const list = mountList();
    const [, jobCard] = list.findAll('.opp-card');

    await jobCard
      .findAll('button')
      .find((candidate) => candidate.text().startsWith('Track'))
      .trigger('click');
    await jobCard.find('.opp-title').trigger('click');

    expect(list.emitted('toggle-save')).toEqual([[ITEMS[1]]]);
    expect(list.emitted('details')).toEqual([[ITEMS[1]]]);
  });

  it('hides the list card when empty', () => {
    const list = mountList({ items: [], viewMode: 'list' });

    expect(list.find('.card').classes()).toContain('d-none');
  });
});
