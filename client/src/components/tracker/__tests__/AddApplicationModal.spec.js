import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AddApplicationModal from '@/components/tracker/AddApplicationModal.vue';

process.env.TZ = 'Asia/Singapore';

function mountModal(props = {}) {
  return mount(AddApplicationModal, { props, global: { stubs: { RouterLink: true } } });
}

function button(wrapper, text) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text);
}

function typePills(wrapper) {
  return wrapper
    .findAll('[role="group"] button')
    .map((pill) => [pill.text(), pill.attributes('aria-pressed')]);
}

async function fillRequired(wrapper) {
  await wrapper.find('#add-title').setValue('Product Intern');
  await wrapper.find('#add-organisation').setValue('Carousell');
}

describe('AddApplicationModal', () => {
  it('validates title and organisation on the first submit', async () => {
    const wrapper = mountModal();
    expect(wrapper.findAll('.is-invalid')).toHaveLength(0);

    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('#add-title').classes()).toContain('is-invalid');
    expect(wrapper.find('#add-organisation').classes()).toContain('is-invalid');
    expect(wrapper.emitted('add')).toBeUndefined();

    await wrapper.find('#add-title').setValue('   ');
    await wrapper.find('#add-organisation').setValue('Carousell');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('#add-title').classes()).toContain('is-invalid');
    expect(wrapper.find('#add-organisation').classes()).not.toContain('is-invalid');
    expect(wrapper.emitted('add')).toBeUndefined();

    await wrapper.find('#add-title').setValue('Product Intern');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('add')).toHaveLength(1);
  });

  it('switches labels and type pills for hackathons', async () => {
    const wrapper = mountModal();
    expect(typePills(wrapper)).toEqual([
      ['Job', 'true'],
      ['Internship', 'false'],
    ]);

    await button(wrapper, 'Hackathon / competition').trigger('click');

    expect(button(wrapper, 'Hackathon / competition').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('label[for="add-title"]').text()).toBe('Event name *');
    expect(wrapper.find('label[for="add-organisation"]').text()).toBe('Organiser *');
    expect(wrapper.find('label[for="add-deadline"]').text()).toBe('Registration deadline');
    expect(typePills(wrapper)).toEqual([
      ['Hackathon', 'true'],
      ['Competition', 'false'],
    ]);

    await button(wrapper, 'Competition').trigger('click');
    await fillRequired(wrapper);
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('add')[0][0].type).toBe('competition');
  });

  it.each([
    ['a bare URL', 'stripe.com/jobs/swe', 'https://stripe.com/jobs/swe'],
    ['an http URL', 'http://acme.test/jobs', 'http://acme.test/jobs'],
    ['an upper-case scheme', 'HTTPS://acme.test/jobs', 'HTTPS://acme.test/jobs'],
    ['no URL', '  ', undefined],
  ])('prefixes https:// only on %s', async (label, typed, sent) => {
    const wrapper = mountModal();

    await fillRequired(wrapper);
    await wrapper.find('#add-url').setValue(typed);
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('add')[0][0].url).toBe(sent);
  });

  it('emits add with the opportunity and details', async () => {
    const wrapper = mountModal({ status: 'interview' });
    expect(wrapper.find('#add-stage').element.value).toBe('interview');
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add to Interview');

    await button(wrapper, 'Internship').trigger('click');
    await wrapper.find('#add-title').setValue('  Data Analyst ');
    await wrapper.find('#add-organisation').setValue(' Grab ');
    await wrapper.find('#add-location').setValue(' Singapore ');
    await wrapper.find('#add-stage').setValue('offer');
    await wrapper.find('#add-deadline').setValue('2026-11-10');
    await wrapper.find('#add-notes').setValue(' Ask Sam for a referral ');
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add to Offer');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('add')[0]).toEqual([
      {
        source: 'manual',
        type: 'internship',
        title: 'Data Analyst',
        organisation: 'Grab',
        url: undefined,
        location: 'Singapore',
      },
      { status: 'offer', notes: 'Ask Sam for a referral', deadline: '2026-11-10T15:59:59.000Z' },
    ]);
  });

  it('shows the error and the saving state', () => {
    const wrapper = mountModal({
      isSaving: true,
      error: 'Could not add the application: Application already exists',
    });

    expect(wrapper.find('[role="alert"]').text()).toBe(
      'Could not add the application: Application already exists',
    );
    expect(wrapper.find('button[type="submit"]').text()).toBe('Adding…');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('closes on Esc and the overlay', async () => {
    const wrapper = mountModal();

    await wrapper.find('.modal').trigger('keydown', { key: 'Escape' });
    await wrapper.find('.modal').trigger('click');
    await wrapper.find('.modal-content').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);

    await button(wrapper, 'Cancel').trigger('click');
    await wrapper.find('button[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(4);
  });
});
