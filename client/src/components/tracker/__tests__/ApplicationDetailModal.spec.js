import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ApplicationDetailModal from '@/components/tracker/ApplicationDetailModal.vue';
import { applications } from '@/__tests__/fixtures/applications';

process.env.TZ = 'Asia/Singapore';

function mountModal(application) {
  return mount(ApplicationDetailModal, {
    props: { application },
    global: { stubs: { RouterLink: true } },
  });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

function steps(wrapper) {
  return wrapper
    .findAll('.checklist-row')
    .map((row) => [row.find('label').text(), row.find('input[type="checkbox"]').element.checked]);
}

describe('ApplicationDetailModal', () => {
  it('shows the listing and the interview field only in the interview stage', async () => {
    const wrapper = mountModal(applications()[0]);

    expect(wrapper.find('h2').text()).toBe('Frontend Intern');
    expect(wrapper.find('.modal-header').text()).toContain('Acme · Singapore');
    expect(wrapper.find('.modal-header .badge').text()).toBe('Internship');
    expect(wrapper.find('a[href="https://adzuna.test/jobs/1"]').exists()).toBe(true);
    expect(wrapper.find('#application-deadline').element.value).toBe('2026-11-06');
    expect(wrapper.find('#application-interview').exists()).toBe(false);

    await wrapper.find('#application-stage').setValue('interview');

    expect(wrapper.find('#application-interview').exists()).toBe(true);
    expect(wrapper.find('#application-deadline').exists()).toBe(false);
  });

  it('shows when the application was saved and when it reached its stage', () => {
    const wrapper = mountModal(applications()[2]);

    const activity = wrapper.findAll('.activity-step').map((step) => step.text());
    expect(activity).toEqual(['Saved 20 Oct', 'Interview 1 Nov']);
  });

  it('manages the checklist: add, rename, toggle, delete, x of n done', async () => {
    const wrapper = mountModal(applications()[2]);
    expect(steps(wrapper)).toEqual([
      ['Research the company', true],
      ['Prepare questions', false],
    ]);
    expect(wrapper.text()).toContain('1 of 2 done');

    const newStep = wrapper.find('input[aria-label="New checklist step"]');
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeDefined();
    await newStep.setValue('Ask Sam for a referral');
    await wrapper.find('form').trigger('submit');
    expect(newStep.element.value).toBe('');
    expect(wrapper.text()).toContain('1 of 3 done');

    await wrapper.find('button[aria-label="Rename Prepare questions"]').trigger('click');
    await wrapper.find('input[aria-label="Rename Prepare questions"]').setValue('X');
    await wrapper.find('input[aria-label="Rename Prepare questions"]').trigger('keydown.esc');
    expect(steps(wrapper)[1][0]).toBe('Prepare questions');
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('button[aria-label="Rename Prepare questions"]').trigger('click');
    await wrapper.find('input[aria-label="Rename Prepare questions"]').setValue('Prepare three');
    await wrapper.find('input[aria-label="Rename Prepare questions"]').trigger('keydown.enter');
    await wrapper.findAll('.checklist-row')[1].find('input[type="checkbox"]').setValue(true);
    expect(wrapper.text()).toContain('2 of 3 done');

    await wrapper.find('button[aria-label="Delete Research the company"]').trigger('click');
    expect(steps(wrapper)).toEqual([
      ['Prepare three', true],
      ['Ask Sam for a referral', false],
    ]);

    await button(wrapper, 'Save changes').trigger('click');
    expect(wrapper.emitted('save')[0][0].checklist).toEqual([
      { label: 'Prepare three', done: true },
      { label: 'Ask Sam for a referral', done: false },
    ]);
  });

  it('says there are no steps once the checklist is empty', async () => {
    const wrapper = mountModal({ ...applications()[2], checklist: [] });

    expect(wrapper.text()).toContain('No steps yet. Add one below.');
    expect(wrapper.text()).not.toContain('done');
  });

  it('emits save with the changes and delete', async () => {
    const wrapper = mountModal(applications()[2]);

    await wrapper.find('#application-notes').setValue('Bring the portfolio.');
    await wrapper.find('#application-interview').setValue('2026-11-05T10:30');
    await button(wrapper, 'Save changes').trigger('click');

    expect(wrapper.emitted('save')[0][0]).toEqual({
      status: 'interview',
      notes: 'Bring the portfolio.',
      checklist: [
        { label: 'Research the company', done: true },
        { label: 'Prepare questions', done: false },
      ],
      interviewAt: '2026-11-05T02:30:00.000Z',
      deadline: null,
      result: null,
    });

    await wrapper.find('#application-interview').setValue('');
    await wrapper.find('#application-stage').setValue('applied');
    await wrapper.find('#application-deadline').setValue('2026-11-12');
    await button(wrapper, 'Save changes').trigger('click');

    expect(wrapper.emitted('save')[1][0]).toMatchObject({
      status: 'applied',
      interviewAt: null,
      deadline: '2026-11-12T15:59:59.000Z',
    });

    await button(wrapper, 'Delete').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('offers a hackathon its own steps and asks how it went in Results', async () => {
    const wrapper = mountModal(applications()[1]);
    const stages = wrapper.find('#application-stage').findAll('option');

    expect(stages.map((option) => option.element.value)).toEqual([
      'saved',
      'registered',
      'team',
      'submitted',
      'results',
    ]);
    expect(wrapper.find('#application-result').exists()).toBe(false);

    await wrapper.find('#application-stage').setValue('results');
    await wrapper.find('#application-result').setValue('won');
    await button(wrapper, 'Save changes').trigger('click');

    expect(wrapper.find('#application-deadline').exists()).toBe(false);
    expect(wrapper.emitted('save')[0][0]).toMatchObject({ status: 'results', result: 'won' });
  });

  it('closes on Esc, the overlay and Cancel', async () => {
    const wrapper = mountModal(applications()[0]);

    await wrapper.find('.modal').trigger('keydown', { key: 'Escape' });
    await wrapper.find('.modal').trigger('click');
    await wrapper.find('.modal-content').trigger('click');
    await button(wrapper, 'Cancel').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(3);
  });

  it('asks an offer holder for interview tips until they are shared', async () => {
    const interview = mountModal(applications()[2]);
    expect(button(interview, 'Share your interview tips')).toBeUndefined();
    expect(interview.text()).not.toContain('Help the next SMU student');

    const offer = { ...applications()[2], status: 'offer' };
    const wrapper = mountModal(offer);

    expect(wrapper.text()).toContain('Got the offer? Help the next SMU student.');
    await button(wrapper, 'Share your interview tips').trigger('click');
    expect(wrapper.emitted('share-tips')).toHaveLength(1);

    const reviewed = mountModal({
      ...offer,
      review: { difficulty: 3, tips: 'Know the product.', createdAt: '2026-11-03T02:00:00.000Z' },
    });
    expect(reviewed.text()).toContain('You shared your tips on 3 Nov');
    expect(button(reviewed, 'Share your interview tips')).toBeUndefined();
  });
});
