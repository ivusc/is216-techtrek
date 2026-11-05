import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TrackerHistory from '@/components/tracker/history/TrackerHistory.vue';

function application(id, { status = 'offer', type = 'job', at = '2026-10-12T00:00:00Z', ...rest } = {}) {
  return {
    _id: id,
    status,
    opportunityId: { title: 'Role ' + id, organisation: 'Org ' + id, type },
    statusHistory: [{ status, at }],
    updatedAt: at,
    ...rest,
  };
}

function mountHistory(applications, props = {}) {
  return mount(TrackerHistory, { props: { applications, ...props } });
}

function row(wrapper, id) {
  return wrapper.findAll('li').find((item) => item.text().includes('Role ' + id));
}

describe('TrackerHistory', () => {
  it('explains how cards get here when it is empty', () => {
    const wrapper = mountHistory([]);

    expect(wrapper.text()).toContain('Nothing in your history yet');
    expect(wrapper.findAll('li')).toHaveLength(0);
  });

  it('groups by month, newest month and newest item first', () => {
    const wrapper = mountHistory([
      application('a', { at: '2026-09-03T00:00:00Z' }),
      application('b', { at: '2026-10-20T00:00:00Z' }),
      application('c', { at: '2026-10-05T00:00:00Z' }),
    ]);

    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual(['October 2026', 'September 2026']);
    expect(wrapper.findAll('.history-open .fw-semibold').map((title) => title.text())).toEqual([
      'Role b',
      'Role c',
      'Role a',
    ]);
  });

  it('summarises with singular and plural wording', () => {
    const one = mountHistory([
      application('a', {
        status: 'offer',
        statusHistory: [
          { status: 'interview', at: '2026-10-01T00:00:00Z' },
          { status: 'offer', at: '2026-10-12T00:00:00Z' },
        ],
      }),
      application('h', { status: 'results', type: 'hackathon' }),
    ]);
    expect(one.text()).toContain('2 finished · 1 reached interview · 1 offer · 1 hackathon or competition');

    const many = mountHistory([
      application('a'),
      application('b'),
      application('h1', { status: 'results', type: 'hackathon' }),
      application('h2', { status: 'results', type: 'hackathon' }),
    ]);
    expect(many.text()).toContain('2 offers · 2 hackathons and competitions');
  });

  it('shows how each one ended and whether tips were shared', () => {
    const wrapper = mountHistory([
      application('a', { status: 'offer', review: { tips: 'Practise SQL' } }),
      application('b', { status: 'rejected' }),
    ]);

    expect(row(wrapper, 'a').find('.history-outcome').text()).toBe('Offer');
    expect(row(wrapper, 'a').text()).toContain('Tips shared');
    expect(row(wrapper, 'b').find('.history-outcome').text()).toBe('Rejected');
    expect(row(wrapper, 'b').text()).not.toContain('Tips shared');
  });

  it('emits open and restore with the application', async () => {
    const item = application('a');
    const wrapper = mountHistory([item]);

    await row(wrapper, 'a').find('.history-open').trigger('click');
    await row(wrapper, 'a').findAll('button').find((button) => button.text() === 'Back to board').trigger('click');

    expect(wrapper.emitted('open')).toEqual([[item]]);
    expect(wrapper.emitted('restore')).toEqual([[item]]);
  });

  it('disables "Back to board" only on the one being moved', () => {
    const wrapper = mountHistory([application('a'), application('b')], { busyId: 'a' });
    const restore = (id) => row(wrapper, id).findAll('button').find((button) => button.text() === 'Back to board');

    expect(restore('a').attributes('disabled')).toBeDefined();
    expect(restore('b').attributes('disabled')).toBeUndefined();
  });
});
