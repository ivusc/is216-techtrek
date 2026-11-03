import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OfferCelebrationModal from '@/components/tracker/OfferCelebrationModal.vue';
import { applications } from '@/__tests__/fixtures/applications';

function mountModal(props = {}) {
  return mount(OfferCelebrationModal, {
    props: { application: { ...applications()[2], status: 'offer' }, step: 'congrats', ...props },
    attachTo: document.body,
  });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

function shareButton(wrapper) {
  return wrapper.find('button[type="submit"]');
}

describe('OfferCelebrationModal', () => {
  it('congratulates the student and offers to share tips or come back later', async () => {
    const wrapper = mountModal();

    expect(wrapper.find('h2').text()).toBe('Congratulations on your offer from Grab!');
    expect(wrapper.text()).toContain('Data Analyst');
    expect(wrapper.text()).toContain('posted anonymously');
    expect(wrapper.find('textarea').exists()).toBe(false);

    await button(wrapper, 'Maybe later').trigger('click');
    await button(wrapper, 'Share your interview tips').trigger('click');

    expect(wrapper.emitted()).toMatchObject({ close: [[]], next: [[]] });
    wrapper.unmount();
  });

  it('asks for the tips before it can submit and sends difficulty 3 unless another is picked', async () => {
    const wrapper = mountModal({ step: 'form' });

    expect(wrapper.find('h2').text()).toBe('Share your interview tips');
    expect(wrapper.find('input[type="radio"]:checked').element.value).toBe('3');
    expect(wrapper.find('#offer-difficulty-hint').text()).toBe('3 of 5 · Moderate');
    expect(shareButton(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('#offer-tips').setValue('   ');
    expect(shareButton(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('#offer-rounds').setValue(' Online test, then two interviews ');
    await wrapper.find('#offer-tips').setValue('Practise SQL joins.');
    expect(wrapper.text()).toContain('19 / 1000');
    await wrapper.find('form').trigger('submit');

    await wrapper.find('input[type="radio"][value="4"]').setValue(true);
    expect(wrapper.find('#offer-difficulty-hint').text()).toBe('4 of 5 · Hard');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toEqual([
      [{ difficulty: 3, rounds: 'Online test, then two interviews', tips: 'Practise SQL joins.' }],
      [{ difficulty: 4, rounds: 'Online test, then two interviews', tips: 'Practise SQL joins.' }],
    ]);
    wrapper.unmount();
  });

  it('shows the error and holds the submit button while saving', async () => {
    const wrapper = mountModal({ step: 'form', busy: true, error: 'Could not share your tips.' });
    await wrapper.find('#offer-tips').setValue('Practise SQL joins.');

    expect(wrapper.find('[role="alert"]').text()).toBe('Could not share your tips.');
    expect(shareButton(wrapper).attributes('disabled')).toBeDefined();

    await button(wrapper, 'Cancel').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('closes on Esc and on a click outside the dialog', async () => {
    const wrapper = mountModal();

    expect(document.activeElement).toBe(wrapper.find('[role="dialog"]').element);
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    await wrapper.find('[role="dialog"]').trigger('click');
    await wrapper.find('.modal-body').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(2);
    wrapper.unmount();
  });
});
