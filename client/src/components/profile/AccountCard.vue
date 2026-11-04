<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { getErrorMessage } from '@/services/teamService';
import PasswordInput from '@/components/PasswordInput.vue';

const auth = useUserStore();
const router = useRouter();

const currentPassword = ref('');
const newPassword = ref('');
const passwordMessage = ref('');
const passwordError = ref('');
const isChangingPassword = ref(false);

const deletePassword = ref('');
const deleteError = ref('');
const isDeleting = ref(false);

async function changePassword() {
  isChangingPassword.value = true;
  passwordMessage.value = '';
  passwordError.value = '';
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    currentPassword.value = '';
    newPassword.value = '';
    passwordMessage.value = 'Password changed.';
  } catch (error) {
    passwordError.value = getErrorMessage(error);
  }
  isChangingPassword.value = false;
}

async function deleteAccount() {
  isDeleting.value = true;
  deleteError.value = '';
  try {
    await auth.deleteMe(deletePassword.value);
    router.push('/login');
  } catch (error) {
    deleteError.value = getErrorMessage(error);
    isDeleting.value = false;
  }
}

async function signOut() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="card profile-card p-4 d-flex flex-column gap-4">
    <h3 class="mb-0">Account</h3>

    <form class="d-flex flex-column gap-3" @submit.prevent="changePassword">
      <h4 class="mb-0">Change password</h4>
      <div class="row g-3">
        <div class="col-12 col-sm-6">
          <label for="current-password" class="form-label small fw-semibold">
            Current password
          </label>
          <PasswordInput id="current-password" v-model="currentPassword" autocomplete="current-password" />
        </div>
        <div class="col-12 col-sm-6">
          <label for="new-password" class="form-label small fw-semibold">New password</label>
          <PasswordInput
            id="new-password"
            v-model="newPassword"
            autocomplete="new-password"
            aria-describedby="new-password-hint"
          />
          <div id="new-password-hint" class="form-text">At least 8 characters.</div>
        </div>
      </div>
      <p v-if="passwordError" class="small text-tt-accent mb-0" role="alert">{{ passwordError }}</p>
      <p v-if="passwordMessage" class="small text-success mb-0" role="status">
        {{ passwordMessage }}
      </p>
      <button
        type="submit"
        class="btn btn-outline-primary fw-semibold align-self-start"
        :disabled="isChangingPassword || currentPassword === '' || newPassword === ''"
      >
        Change password
      </button>
    </form>

    <div class="border-top pt-4 d-flex flex-column gap-3">
      <h4 class="mb-0">Delete account</h4>
      <p class="small text-body-secondary mb-0">
        This removes your profile, applications, interview practice and join requests, and deletes
        the teams you lead. It cannot be undone.
      </p>
      <div>
        <label for="delete-password" class="form-label small fw-semibold">
          Type your password to confirm
        </label>
        <PasswordInput id="delete-password" v-model="deletePassword" autocomplete="current-password" />
      </div>
      <p v-if="deleteError" class="small text-tt-accent mb-0" role="alert">{{ deleteError }}</p>
      <button
        type="button"
        class="btn btn-danger fw-semibold align-self-start"
        :disabled="deletePassword === '' || isDeleting"
        @click="deleteAccount"
      >
        Delete account
      </button>
    </div>

    <div class="border-top pt-4 d-md-none">
      <button type="button" class="btn btn-light fw-semibold" @click="signOut">
        <i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Sign out
      </button>
    </div>
  </div>
</template>
