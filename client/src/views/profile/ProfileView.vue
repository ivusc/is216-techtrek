<script setup>
import { computed, nextTick, ref } from 'vue';
import './profile.css';
import { useUserStore } from '@/store/user';
import { getErrorMessage } from '@/services/teamService';
import PageHeader from '@/components/PageHeader.vue';
import IdentityCard from '@/components/profile/IdentityCard.vue';
import LinksCard from '@/components/profile/LinksCard.vue';
import AboutCard from '@/components/profile/AboutCard.vue';
import SkillsCard from '@/components/profile/SkillsCard.vue';
import AccountCard from '@/components/profile/AccountCard.vue';
import SaveBar from '@/components/profile/SaveBar.vue';

const auth = useUserStore();

const draft = ref(copyProfile());
const editing = ref(false);
const isSaving = ref(false);
const saveError = ref('');
const savedMessage = ref('');

function copyProfile() {
  const user = auth.user ?? {};
  return {
    displayName: user.displayName ?? '',
    faculty: user.faculty ?? '',
    year: user.year ?? '',
    course: user.course ?? '',
    about: user.about ?? '',
    skills: [...(user.skills ?? [])],
    linkedinUrl: user.linkedinUrl ?? '',
    githubUrl: user.githubUrl ?? '',
    telegram: user.telegram ?? '',
    openToTeams: user.openToTeams ?? true,
  };
}

const changes = computed(() => {
  const saved = copyProfile();
  return Object.fromEntries(
    Object.entries(draft.value).filter(
      ([field, value]) => JSON.stringify(value) !== JSON.stringify(saved[field]),
    ),
  );
});

const isDirty = computed(() => Object.keys(changes.value).length > 0);

async function startEditing() {
  editing.value = true;
  savedMessage.value = '';
  await nextTick();
  document.getElementById('profile-name')?.focus();
}

async function finishEditing(message) {
  editing.value = false;
  savedMessage.value = message;
  await nextTick();
  document.getElementById('profile-edit')?.focus();
}

function discard() {
  draft.value = copyProfile();
  saveError.value = '';
  finishEditing('');
}

async function save() {
  isSaving.value = true;
  saveError.value = '';
  try {
    await auth.updateMe(changes.value);
    draft.value = copyProfile();
    await finishEditing('Profile saved.');
  } catch (error) {
    saveError.value = getErrorMessage(error);
  }
  isSaving.value = false;
}
</script>

<template>
  <div class="profile-page" :class="{ 'has-save-bar': editing || isDirty }">
    <PageHeader
      title="Your profile"
      subtitle="How you appear to teams, and what we use to recommend opportunities."
      :show-search="false"
    />
    <p class="visually-hidden" role="status">{{ savedMessage }}</p>

    <div class="row g-4 align-items-start">
      <div class="col-12 col-lg-5 col-xl-4 d-flex flex-column gap-4">
        <IdentityCard
          v-model:display-name="draft.displayName"
          v-model:faculty="draft.faculty"
          v-model:year="draft.year"
          v-model:course="draft.course"
          :email="auth.username ?? ''"
          :open-to-teams="draft.openToTeams"
          :editing="editing"
          @edit="startEditing"
        />
        <LinksCard
          v-model:github="draft.githubUrl"
          v-model:linkedin="draft.linkedinUrl"
          v-model:telegram="draft.telegram"
          :editing="editing"
        />
        <div class="card profile-card p-4 d-flex flex-row align-items-center gap-3">
          <div class="flex-grow-1">
            <label for="open-to-teams" class="d-block small fw-semibold">
              Show me in Teammate Finder
            </label>
            <span class="text-caption text-body-tertiary">
              Team leaders can invite you based on your skills.
            </span>
          </div>
          <div class="form-check form-switch m-0">
            <input
              id="open-to-teams"
              v-model="draft.openToTeams"
              class="form-check-input profile-switch"
              type="checkbox"
              role="switch"
            />
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7 col-xl-8 d-flex flex-column gap-4">
        <AboutCard v-model="draft.about" :editing="editing" />
        <SkillsCard v-model="draft.skills" />
        <SaveBar
          v-if="editing || isDirty"
          :busy="isSaving"
          :can-save="isDirty"
          :error="saveError"
          @save="save"
          @discard="discard"
        />
        <AccountCard />
      </div>
    </div>
  </div>
</template>
