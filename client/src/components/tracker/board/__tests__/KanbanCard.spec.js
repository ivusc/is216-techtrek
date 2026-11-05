import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanCard from '@/components/tracker/board/KanbanCard.vue';
import { NOW, applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

beforeEach(() => vi.setSystemTime(new Date(NOW)));
afterEach(() => vi.useRealTimers());

function mountCard(overrides = {}) {
  return mount(KanbanCard, { props: { application: { ...applications()[0], ...overrides } } });
}

function dateLine(wrapper) {
  return wrapper.find('span.flex-grow-1');
}

describe('KanbanCard', () => {
  it('shows the organisation, title, type and notes', () => {
    const wrapper = mountCard();

    expect(wrapper.find('.org-logo').text()).toBe('AC');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.find('.kanban-card > p').text()).toBe('Frontend Intern');
    expect(wrapper.find('.badge').text()).toBe('Internship');
    expect(wrapper.find('[aria-label="Notes: Saved via techtrek."]').exists()).toBe(true);
    expect(wrapper.classes()).not.toContain('is-rejected');
  });

  it.each([
    [
      'an interview',
      { status: 'interview', interviewAt: '2026-11-04T06:00:00.000Z' },
      'Interview 4 Nov',
      false,
    ],
    [
      'an offer',
      { status: 'offer', deadline: '2026-11-07T15:59:00.000Z' },
      'Reply by 7 Nov',
      false,
    ],
    [
      'a rejection',
      { status: 'rejected', updatedAt: '2026-10-31T02:00:00.000Z' },
      'Closed 31 Oct',
      false,
    ],
    [
      'a deadline within a week',
      { status: 'saved', deadline: '2026-11-06T15:59:00.000Z' },
      'Due 6 Nov',
      true,
    ],
    [
      'a deadline seven days out',
      { status: 'saved', deadline: '2026-11-09T15:59:00.000Z' },
      'Due 9 Nov',
      true,
    ],
    [
      'a deadline eight days out',
      { status: 'saved', deadline: '2026-11-10T15:59:00.000Z' },
      'Due 10 Nov',
      false,
    ],
    [
      'an overdue deadline',
      { status: 'applied', deadline: '2026-11-01T15:59:00.000Z' },
      'Due 1 Nov',
      true,
    ],
    [
      'a deadline further out',
      { status: 'saved', deadline: '2026-11-20T15:59:00.000Z' },
      'Due 20 Nov',
      false,
    ],
    [
      'an interview without a time',
      { status: 'interview', deadline: '2026-11-20T15:59:00.000Z' },
      'Due 20 Nov',
      false,
    ],
    [
      'an application without a deadline',
      { status: 'applied', deadline: undefined, updatedAt: '2026-10-30T02:00:00.000Z' },
      'Applied 30 Oct',
      false,
    ],
    [
      'a saved card without a deadline',
      { status: 'saved', deadline: undefined },
      'No deadline',
      false,
    ],
  ])('dates %s', (label, overrides, text, urgent) => {
    const wrapper = mountCard(overrides);

    expect(dateLine(wrapper).text()).toBe(text);
    expect(dateLine(wrapper).classes().includes('text-danger-emphasis')).toBe(urgent);
  });

  it('fades a rejected card', () => {
    expect(mountCard({ status: 'rejected' }).classes()).toContain('is-rejected');
  });

  it('opens on click and on Enter', async () => {
    const wrapper = mountCard();

    await wrapper.trigger('click');
    await wrapper.trigger('keydown.enter');

    expect(wrapper.emitted('open')).toHaveLength(2);
  });

  it('emits move from the menu without opening the card', async () => {
    const wrapper = mountCard();
    const items = wrapper.findAll('.dropdown-item');
    expect(items.map((item) => item.text())).toEqual(['Applied', 'Interview', 'Offer', 'Rejected', 'Move to history']);

    await items[1].trigger('click');
    await wrapper.find('button[aria-label="Move Frontend Intern"]').trigger('keydown.enter');

    expect(wrapper.emitted('move')).toEqual([['interview']]);
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it("opens its menu outside the column, so the column's scrolling can't cut it off", () => {
    const toggle = mountCard().find('button[data-bs-toggle="dropdown"]');

    expect(JSON.parse(toggle.attributes('data-bs-popper-config'))).toEqual({ strategy: 'fixed' });
  });

  it('moves to history from the menu', async () => {
    const wrapper = mountCard();

    await wrapper.findAll('.dropdown-item').find((item) => item.text() === 'Move to history').trigger('click');

    expect(wrapper.emitted('archive')).toHaveLength(1);
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it('puts its id on the drag', async () => {
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'all' };
    const wrapper = mountCard();

    await wrapper.trigger('dragstart', { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'a1');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('suggests a follow-up on an Applied card with no news for 14 days, and marks it in one click', async () => {
    // NOW is 3 Nov; applied 16 days before
    const wrapper = mountCard({ status: 'applied', deadline: undefined, appliedAt: '2026-10-18T00:00:00.000Z' });
    const nudge = wrapper.find('.follow-up-nudge');

    expect(nudge.text()).toContain('Applied 16 days ago with no update. Send a follow-up?');
    await nudge.find('button').trigger('click');
    expect(wrapper.emitted('follow-up')).toHaveLength(1);
    // the click doesn't also open the card
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it('shows "Followed up" instead of the nudge once it is done', () => {
    const wrapper = mountCard({
      status: 'applied',
      deadline: undefined,
      appliedAt: '2026-10-01T00:00:00.000Z',
      followedUpAt: '2026-11-01T02:00:00.000Z',
    });

    expect(wrapper.find('.follow-up-nudge').exists()).toBe(false);
    expect(wrapper.find('.followed-up').text()).toBe('Followed up 1 Nov');
  });

  it('leaves recent and non-Applied cards alone', () => {
    expect(mountCard({ status: 'applied', appliedAt: '2026-10-30T00:00:00.000Z' }).find('.follow-up-nudge').exists()).toBe(false);
    expect(mountCard({ status: 'interview', appliedAt: '2026-09-01T00:00:00.000Z' }).find('.follow-up-nudge').exists()).toBe(false);
  });
});

