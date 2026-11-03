<script setup>
import '@/views/login/LoginView.css';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const reEnteredPassword = ref('');
const errorMessage = ref('');

async function submitForm() {
  errorMessage.value = '';
  if (email.value.includes('@') == false || email.value.split('@')[1] != 'smu.edu.sg') {
    errorMessage.value = 'Please enter a valid SMU email.';
    return;
  }
  if (reEnteredPassword.value != password.value) {
    errorMessage.value = "The passwords don't match!";
    return;
  }
  if (password.value.length < 8) {
    errorMessage.value =
      'Your password should be at least 8 charcters long with 1 number, uppercase alphabet and symbol.';
    return;
  }
  const regex1 = /[^a-zA-Z0-9 ]/;
  const regex2 = /\d/;
  const regex3 = /[A-Z]/;
  if (!regex1.test(password.value)) {
    errorMessage.value = 'Your password should be at least 1 symbol.';
    return;
  }
  if (!regex2.test(password.value)) {
    errorMessage.value = 'Your password should be at least 1 digit.';
    return;
  }
  if (!regex3.test(password.value)) {
    errorMessage.value = 'Your password should be at least 1 uppercase letter.';
    return;
  }
  const cleanEmail = email.value.trim().toLowerCase();
  try {
    // the server logs the new account in straight away
    await userStore.register(cleanEmail, password.value);
    errorMessage.value = '';
    router.push('/home');
  } catch (err) {
    switch (err.response?.status) {
      case 400:
        if (err.response.data.error === 'Username already exists.') {
          errorMessage.value = 'This email is already in use.';
        } else {
          errorMessage.value = err.response.data.error;
        }
        break;
      case 500:
        errorMessage.value = 'Something unexpected went wrong. Please try again.';
        break;
      default:
        errorMessage.value = 'Could not reach the server. Is it running?';
        break;
    }
    console.error(err.response?.data?.error);
  }
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <div class="form-field">
      <div class="d-flex flex-column gap-1">
        <h1 class="mb-0">Welcome to TechTrek</h1>
        <p class="text-body-secondary mb-0">
          Create an account with your SMU email to begin your trek into tech.
        </p>
      </div>
      <div>
        <label for="signup-email" class="form-label small fw-semibold">SMU email</label>
        <div class="position-relative">
          <i
            class="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
            aria-hidden="true"
          ></i>
          <input
            id="signup-email"
            type="email"
            class="form-control ps-5"
            v-model="email"
            autocomplete="username"
            inputmode="email"
            placeholder="you@smu.edu.sg"
          />
        </div>
      </div>
      <div>
        <label for="signup-password" class="form-label small fw-semibold">Password</label>
        <div class="position-relative">
          <i
            class="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
            aria-hidden="true"
          ></i>
          <input
            id="signup-password"
            type="password"
            class="form-control ps-5"
            v-model="password"
            autocomplete="new-password"
            placeholder="••••••••••"
            aria-describedby="signup-password-hint"
          />
        </div>
        <div id="signup-password-hint" class="form-text">
          At least 8 characters with a number, an uppercase letter and a symbol.
        </div>
      </div>
      <div>
        <label for="signup-confirm" class="form-label small fw-semibold">Re-enter password</label>
        <div class="position-relative">
          <i
            class="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
            aria-hidden="true"
          ></i>
          <input
            id="signup-confirm"
            type="password"
            class="form-control ps-5"
            v-model="reEnteredPassword"
            autocomplete="new-password"
            placeholder="••••••••••"
          />
        </div>
      </div>
      <p v-if="errorMessage" class="errors mb-0" role="alert">{{ errorMessage }}</p>
      <button type="submit" class="btn btn-primary fw-semibold">Create account</button>
      <p
        class="d-flex align-items-center gap-2 bg-primary-subtle text-primary rounded-2 small fw-medium px-3 py-2 mb-0"
      >
        <i class="bi bi-lock" aria-hidden="true"></i>
        Sign-up is limited to @smu.edu.sg emails.
      </p>
    </div>
  </form>
</template>

<style lang="scss" scoped></style>
