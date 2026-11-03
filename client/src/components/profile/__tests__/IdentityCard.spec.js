import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import { useUserStore } from '@/store/user';
import { toAvatarBlob } from '@/utils/image';
import IdentityCard from '@/components/profile/IdentityCard.vue';

vi.mock('@/utils/image', () => ({ toAvatarBlob: vi.fn() }));

const mock = new MockAdapter(serverAPI);

const USER = {
  _id: 'u1',
  userName: 'kellie.jubela@smu.edu.sg',
  displayName: 'Kellie Jubela',
};
const UPDATED_AT = '2026-11-03T08:00:00.000Z';
const PHOTO = new Blob(['jpeg bytes'], { type: 'image/jpeg' });

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = { ...USER };
  vi.mocked(toAvatarBlob).mockReset();
});

afterEach(() => mock.reset());

function mountCard(props = {}) {
  return mount(IdentityCard, {
    props: { displayName: USER.displayName, email: USER.userName, ...props },
  });
}

function photoLabel(wrapper) {
  return wrapper.find('label[for="profile-photo"]').text();
}

async function choose(wrapper, file) {
  const input = wrapper.find('#profile-photo');
  Object.defineProperty(input.element, 'files', { value: [file] });
  await input.trigger('change');
  await flushPromises();
}

function removeButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === 'Remove photo');
}

describe('IdentityCard photo', () => {
  it('uploads a processed photo', async () => {
    const file = new File(['png bytes'], 'me.png', { type: 'image/png' });
    vi.mocked(toAvatarBlob).mockResolvedValue(PHOTO);
    mock.onPut('/me/avatar').reply(200, { user: { ...USER, avatar: { updatedAt: UPDATED_AT } } });
    const wrapper = mountCard();
    expect(photoLabel(wrapper)).toBe('Add a photo');
    expect(wrapper.find('img').exists()).toBe(false);

    await choose(wrapper, file);

    expect(toAvatarBlob).toHaveBeenCalledWith(file);
    const [upload] = mock.history.put;
    expect(upload.url).toBe('/me/avatar');
    expect(upload.data).toBe(PHOTO);
    expect(upload.headers['Content-Type']).toBe('image/jpeg');
    expect(photoLabel(wrapper)).toBe('Change photo');
    expect(wrapper.find('img').attributes('src')).toContain(
      `/users/u1/avatar?v=${encodeURIComponent(UPDATED_AT)}`,
    );
    expect(wrapper.find('#profile-photo').attributes('disabled')).toBeUndefined();
  });

  it.each([
    [
      'that is not an image',
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
      () => vi.mocked(toAvatarBlob).mockRejectedValue(new Error('Choose an image file.')),
      'Choose an image file.',
      0,
    ],
    [
      'the server refuses',
      new File(['png bytes'], 'me.png', { type: 'image/png' }),
      () => {
        vi.mocked(toAvatarBlob).mockResolvedValue(PHOTO);
        mock.onPut('/me/avatar').reply(400, { error: 'Upload a JPEG, PNG or WebP image.' });
      },
      'Upload a JPEG, PNG or WebP image.',
      1,
    ],
  ])('shows why a file %s was refused', async (label, file, arrange, message, uploads) => {
    arrange();
    const wrapper = mountCard();

    await choose(wrapper, file);

    expect(wrapper.find('[role="alert"]').text()).toBe(message);
    expect(mock.history.put).toHaveLength(uploads);
    expect(photoLabel(wrapper)).toBe('Add a photo');
    expect(wrapper.find('#profile-photo').attributes('disabled')).toBeUndefined();
  });

  it('removes the photo', async () => {
    useUserStore().user = { ...USER, avatar: { updatedAt: UPDATED_AT } };
    mock.onDelete('/me/avatar').reply(200, { user: { ...USER } });
    const wrapper = mountCard();
    expect(photoLabel(wrapper)).toBe('Change photo');
    expect(wrapper.find('img').exists()).toBe(true);

    await removeButton(wrapper).trigger('click');
    await flushPromises();

    expect(mock.history.delete).toHaveLength(1);
    expect(removeButton(wrapper)).toBeUndefined();
    expect(photoLabel(wrapper)).toBe('Add a photo');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('KJ');
  });

  it('offers no remove button without a photo', () => {
    expect(removeButton(mountCard())).toBeUndefined();
  });
});

describe('IdentityCard details', () => {
  it('shows the profile and emits edit', async () => {
    const wrapper = mountCard({ year: 2, course: 'Information Systems', openToTeams: true });

    expect(wrapper.find('h2').text()).toBe('Kellie Jubela');
    expect(wrapper.text()).toContain('Year 2 · Information Systems · SMU');
    expect(wrapper.text()).toContain('kellie.jubela@smu.edu.sg');
    expect(wrapper.text()).toContain('Open to teams');
    expect(wrapper.find('#profile-name').exists()).toBe(false);

    await wrapper.find('#profile-edit').trigger('click');

    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  it('switches to the edit fields and reports every change', async () => {
    const wrapper = mountCard({ editing: true, year: '', course: '' });

    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.find('#profile-edit').exists()).toBe(false);
    expect(wrapper.find('#profile-name').element.value).toBe('Kellie Jubela');

    await wrapper.find('#profile-name').setValue('Kellie J');
    await wrapper.find('#profile-year').setValue('3');
    await wrapper.find('#profile-course').setValue('Computer Science');

    expect(wrapper.emitted('update:displayName')).toEqual([['Kellie J']]);
    expect(wrapper.emitted('update:year')).toEqual([[3]]);
    expect(wrapper.emitted('update:course')).toEqual([['Computer Science']]);
  });
});
