<script setup>
import { computed } from 'vue';
import { getInitials } from '@/utils/team';

const displayName = defineModel('displayName', { type: String, required: true });
const year = defineModel('year', { type: [Number, String], default: '' });
const course = defineModel('course', { type: String, default: '' });

const props = defineProps({
  email: { type: String, default: '' },
  openToTeams: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
});

defineEmits(['edit']);

const schoolLine = computed(() =>
  [year.value ? `Year ${year.value}` : '', course.value, 'SMU'].filter(Boolean).join(' · '),
);

const initials = computed(() => getInitials(displayName.value || props.email));
</script>

<template>
  <div class="card profile-card identity-card overflow-hidden">
    <div class="identity-banner bg-primary position-relative overflow-hidden" aria-hidden="true">
      <span class="banner-circle banner-circle-teal"></span>
      <span class="banner-circle banner-circle-coral"></span>
      <span class="banner-circle banner-circle-peach"></span>
    </div>

    <div class="d-flex flex-column align-items-center text-center gap-2 px-4 pt-3 pb-4">
      <span
        class="identity-avatar h2 mb-0 rounded-circle d-flex align-items-center justify-content-center"
      >
        {{ initials }}
      </span>

      <template v-if="!editing">
        <h2 class="mb-0 text-break">{{ displayName }}</h2>
        <p class="small text-body-secondary mb-0">{{ schoolLine }}</p>
        <p class="text-caption text-body-tertiary mb-0 text-break">{{ email }}</p>
        <span v-if="openToTeams" class="badge rounded-pill bg-info-subtle text-body fw-medium">
          ● Open to teams
        </span>
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
