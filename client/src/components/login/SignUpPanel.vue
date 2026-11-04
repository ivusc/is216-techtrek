<script setup>
import '@/views/login/LoginView.css';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import PasswordInput from '@/components/PasswordInput.vue';

defineEmits(['switch-to-login']);

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const reEnteredPassword = ref('');
const errorMessage = ref('');
const busy = ref(false);

// the same rules the server checks, ticked off live under the password box
const rules = computed(() => [
  { label: '8+ characters', met: password.value.length >= 8 },
  { label: 'A number', met: /\d/.test(password.value) },
  { label: 'An uppercase letter', met: /[A-Z]/.test(password.value) },
  { label: 'A symbol', met: /[^a-zA-Z0-9 ]/.test(password.value) },
]);
const passwordsMatch = computed(
  () => reEnteredPassword.value !== '' && reEnteredPassword.value === password.value,
);

async function submitForm() {
  if (busy.value) return;
  errorMessage.value = '';
  const cleanEmail = email.value.trim().toLowerCase();
  if (cleanEmail.split('@')[1] != 'smu.edu.sg') {
    errorMessage.value = 'Please enter a valid SMU email.';
    return;
  }
  if (reEnteredPassword.value != password.value) {
    errorMessage.value = "The passwords don't match!";
    return;
  }
  if (password.value.length < 8) {
    errorMessage.value =
      'Your password should be at least 8 characters long with 1 number, uppercase alphabet and symbol.';
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
  busy.value = true;
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
  } finally {
    busy.value = false;
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
            aria-describedby="signup-email-hint"
          />
        </div>
        <div id="signup-email-hint" class="form-text">Sign-up is limited to @smu.edu.sg emails.</div>
      </div>
      <div>
        <label for="signup-password" class="form-label small fw-semibold">Password</label>
        <PasswordInput
          id="signup-password"
          v-model="password"
          lock-icon
          autocomplete="new-password"
          placeholder="••••••••••"
          aria-describedby="signup-password-hint"
        />
        <ul id="signup-password-hint" class="password-rules" aria-label="Password needs">
          <li v-for="rule in rules" :key="rule.label" :class="{ met: rule.met }">
            <i :class="rule.met ? 'bi bi-check-circle-fill' : 'bi bi-circle'" aria-hidden="true"></i>
            {{ rule.label }}<span class="visually-hidden">{{ rule.met ? ' (done)' : '' }}</span>
          </li>
        </ul>
      </div>
      <div>
        <label for="signup-confirm" class="form-label small fw-semibold">Re-enter password</label>
        <PasswordInput
          id="signup-confirm"
          v-model="reEnteredPassword"
          lock-icon
          autocomplete="new-password"
          placeholder="••••••••••"
          aria-describedby="signup-confirm-hint"
        />
        <div
          v-if="reEnteredPassword"
          id="signup-confirm-hint"
          class="form-text match-hint"
          :class="{ met: passwordsMatch }"
        >
          <template v-if="passwordsMatch">
            <i class="bi bi-check-circle-fill" aria-hidden="true"></i> Passwords match
          </template>
          <template v-else>Doesn't match yet</template>
        </div>
      </div>
      <div class="d-flex flex-column gap-3">
        <div v-if="errorMessage" class="form-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span role="alert">{{ errorMessage }}</span>
        </div>
        <button type="submit" class="btn btn-primary btn-auth" :disabled="busy">
          <span v-if="busy" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          {{ busy ? 'Creating account…' : 'Create account' }}
        </button>
      </div>
      <p class="form-switch-line">
        Already have an account?
        <button type="button" class="btn btn-link" @click="$emit('switch-to-login')">Log in</button>
      </p>
    </div>
  </form>
</template>
