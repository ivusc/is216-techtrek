<script setup>
import '@/views/login/LoginView.css';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';

defineEmits(['switch-to-login']);

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const reEnteredPassword = ref('');
const errorMessage = ref('');

async function submitForm() {
  if (email.value.includes('@') == false || email.value.split('@')[1] != 'smu.edu.sg') {
    errorMessage.value = 'Please enter a valid SMU email.';
    return;
  }
  if (reEnteredPassword.value != password.value) {
    errorMessage.value = "The passwords don't match!";
    return;
  }
  if (password.value.trim().length < 8) {
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
      <div>
        <h1 class="form-title">Welcome to TechTrek</h1>
        <p class="form-subtitle">Create an account with your SMU email to begin your trek into tech.</p>
      </div>
      <p v-if="errorMessage" class="errors">{{ errorMessage }}</p>
      <div>
        <label for="signup-email" class="form-label">SMU email</label>
        <div class="icon-input">
          <i class="bi bi-envelope"></i>
          <input
            id="signup-email"
            type="email"
            class="form-control"
            v-model="email"
            autocomplete="username"
            placeholder="john.doe.2025@smu.edu.sg"
          />
        </div>
      </div>
      <div>
        <label for="signup-password" class="form-label">Password</label>
        <div class="icon-input">
          <i class="bi bi-lock"></i>
          <input
            id="signup-password"
            type="password"
            class="form-control"
            v-model="password"
            autocomplete="new-password"
            placeholder="••••••••••"
          />
        </div>
        <small class="text-body-secondary">At least 8 characters, with 1 number, 1 uppercase letter and 1 symbol.</small>
      </div>
      <div>
        <label for="signup-password-again" class="form-label">Re-enter password</label>
        <div class="icon-input">
          <i class="bi bi-lock"></i>
          <input
            id="signup-password-again"
            type="password"
            class="form-control"
            v-model="reEnteredPassword"
            autocomplete="new-password"
            placeholder="••••••••••"
          />
        </div>
      </div>
      <button type="submit" class="btn btn-primary fw-semibold">Create account</button>
      <p class="form-note mb-0">
        <i class="bi bi-lock"></i>
        Sign-up is limited to @smu.edu.sg emails.
      </p>
      <p class="text-center small text-body-secondary mb-0">
        Already have an account?
        <a href="#" class="text-body-secondary" @click.prevent="$emit('switch-to-login')">Log in</a>
      </p>
    </div>
  </form>
</template>

<style lang="scss" scoped></style>
