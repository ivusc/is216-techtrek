<script setup>
import { computed, ref } from 'vue';
import { useUserStore } from '@/store/user';
import { getErrorMessage } from '@/services/teamService';
import { toAvatarBlob } from '@/utils/image';
import UserAvatar from '@/components/UserAvatar.vue';
import AvatarPicker from '@/components/AvatarPicker.vue';
import { faculties } from '@/constants';

const displayName = defineModel('displayName', { type: String, required: true });
const year = defineModel('year', { type: [Number, String], default: '' });
const course = defineModel('course', { type: String, default: '' });
const faculty = defineModel('faculty', { type: String, default: '' });

defineProps({
  email: { type: String, default: '' },
  openToTeams: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
});

// toggle-open: the "Open to teams" switch was clicked (the page saves it straight away)
defineEmits(['edit', 'toggle-open']);

const schoolLine = computed(() =>
  [year.value ? `Year ${year.value}` : '', course.value, faculty.value || 'SMU']
    .filter(Boolean)
    .join(' · '),
);

const auth = useUserStore();
const isUploading = ref(false);
const photoError = ref('');
const photoLabel = computed(() => (auth.avatarUpdatedAt ? 'Change photo' : 'Add a photo'));

async function updatePhoto(change) {
  isUploading.value = true;
  photoError.value = '';
  try {
    await change();
  } catch (error) {
    photoError.value = getErrorMessage(error);
  }
  isUploading.value = false;
}

function choosePhoto(event) {
  const [file] = event.target.files;
  event.target.value = '';
  if (file) updatePhoto(async () => auth.uploadAvatar(await toAvatarBlob(file)));
}

function removePhoto() {
  updatePhoto(() => auth.removeAvatar());
}

// no photo? pick one of the illustrated characters instead
const pickerOpen = ref(false);
function pickCharacter(key) {
  updatePhoto(() => auth.setAvatarPreset(key));
}
</script>

<template>
  <div class="card profile-card identity-card overflow-hidden">
    <div class="identity-banner bg-primary position-relative overflow-hidden" aria-hidden="true">
      <span class="banner-circle banner-circle-teal"></span>
      <span class="banner-circle banner-circle-coral"></span>
      <span class="banner-circle banner-circle-peach"></span>
    </div>

    <div class="d-flex flex-column align-items-center text-center gap-2 px-4 pt-3 pb-4">
      <div class="position-relative">
        <UserAvatar
          :user-id="auth._id ?? ''"
          :name="displayName || email"
          :avatar-updated-at="auth.avatarUpdatedAt"
          :size="72"
          class="identity-avatar bg-tt-peach text-body"
        />
        <input
          id="profile-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="identity-photo-input visually-hidden"
          :disabled="isUploading"
          @change="choosePhoto"
        />
        <label
          for="profile-photo"
          class="identity-photo-button btn btn-light rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center"
          :title="photoLabel"
        >
          <i class="bi bi-camera" aria-hidden="true"></i>
          <span class="visually-hidden">{{ photoLabel }}</span>
        </label>
      </div>
      <p v-if="photoError" class="small text-tt-accent mb-0" role="alert">{{ photoError }}</p>
      <div class="d-flex flex-wrap justify-content-center column-gap-3">
        <button
          type="button"
          class="btn btn-link btn-sm p-0 text-caption text-decoration-none"
          :aria-expanded="pickerOpen"
          aria-controls="profile-avatar-picker"
          @click="pickerOpen = !pickerOpen"
        >
          {{ pickerOpen ? 'Hide characters' : 'Choose a character' }}
        </button>
        <button
          v-if="auth.avatarUpdatedAt"
          type="button"
          class="btn btn-link btn-sm p-0 text-caption text-decoration-none"
          :disabled="isUploading"
          @click="removePhoto"
        >
          {{ auth.avatarPreset ? 'Remove picture' : 'Remove photo' }}
        </button>
      </div>
      <AvatarPicker
        v-if="pickerOpen"
        id="profile-avatar-picker"
        class="w-100 text-start"
        :selected="auth.avatarPreset"
        :busy="isUploading"
        @pick="pickCharacter"
      />

      <template v-if="!editing">
        <h2 class="mb-0 text-break">{{ displayName }}</h2>
        <p class="small text-body-secondary mb-0">{{ schoolLine }}</p>
        <p class="text-caption text-body-tertiary mb-0 text-break">{{ email }}</p>
        <!-- a switch: click to show or hide yourself in Teammate Finder -->
        <button
          type="button"
          role="switch"
          class="open-toggle badge rounded-pill fw-medium border-0"
          :class="openToTeams ? 'bg-info-subtle text-body' : 'bg-body-secondary text-body-secondary'"
          :aria-checked="openToTeams"
          :title="openToTeams ? 'Team leads can find and invite you. Click to hide.' : 'Hidden from Teammate Finder. Click to show.'"
          @click="$emit('toggle-open')"
        >
          {{ openToTeams ? '● Open to teams' : '○ Not open to teams' }}
        </button>
        <button
          id="profile-edit"
          type="button"
          class="btn btn-sm btn-outline-primary fw-semibold w-100 mt-1"
          @click="$emit('edit')"
        >
          <i class="bi bi-pencil me-2" aria-hidden="true"></i>Edit profile
        </button>
      </template>

      <div v-else class="w-100 text-start d-flex flex-column gap-3 mt-1">
        <div>
          <label for="profile-name" class="form-label small fw-semibold">Display name</label>
          <input
            id="profile-name"
            v-model="displayName"
            class="form-control"
            maxlength="60"
            autocomplete="name"
            required
          />
        </div>
        <div>
          <label for="profile-faculty" class="form-label small fw-semibold">School</label>
          <select id="profile-faculty" v-model="faculty" class="form-select">
            <option v-if="!faculty" value="" disabled>Pick your SMU school</option>
            <option v-for="option in faculties" :key="option.code" :value="option.code">
              {{ option.code }} · {{ option.name }}
            </option>
          </select>
        </div>
        <div class="row g-2">
          <div class="col-5">
            <label for="profile-year" class="form-label small fw-semibold">Year</label>
            <select id="profile-year" v-model.number="year" class="form-select">
              <option value="">Not set</option>
              <option v-for="n in 4" :key="n" :value="n">Year {{ n }}</option>
            </select>
          </div>
          <div class="col-7">
            <label for="profile-course" class="form-label small fw-semibold">Course</label>
            <input
              id="profile-course"
              v-model="course"
              class="form-control"
              maxlength="80"
              placeholder="Information Systems"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* the Open to teams switch: lifts a little on hover so it reads as clickable */
.open-toggle {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.open-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(28, 26, 61, 0.12);
}
.open-toggle:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}
</style>
