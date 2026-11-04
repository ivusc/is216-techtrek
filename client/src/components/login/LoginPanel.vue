<script setup>
import '@/views/login/LoginView.css';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import PasswordInput from '@/components/PasswordInput.vue';

defineEmits(['switch-to-signup']);

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const rememberUser = ref(false);
const errorMessage = ref('');
const busy = ref(false);

function sameOriginPath(target) {
  return typeof target === 'string' && /^\/(?![/\\])/.test(target) ? target : '/home';
}

async function submitForm() {
  if (busy.value) return;
  errorMessage.value = '';
  const cleanEmail = email.value.trim().toLowerCase();
  if (cleanEmail.split('@')[1] != 'smu.edu.sg') {
    errorMessage.value = 'Please enter a valid SMU email.';
    password.value = '';
    return;
  }

  busy.value = true;
  try {
    await userStore.login(cleanEmail, password.value);

    if (rememberUser.value) {
      localStorage.setItem('email', email.value);
      localStorage.setItem('rememberUser', true);
    } else {
      localStorage.removeItem('email');
      localStorage.removeItem('rememberUser');
    }
    errorMessage.value = '';
    // go back to the page the guard sent us away from, if there was one
    router.push(sameOriginPath(route.query.redirect));
  } catch (err) {
    switch (err.response?.status) {
      case 404:
        errorMessage.value =
          'This email has not been registered with us. Click on Sign up to create an account!';
        break;
      case 401:
        errorMessage.value = 'Wrong password!';
        break;
      case 400:
        errorMessage.value = err.response.data.error;
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
  password.value = '';
}

onMounted(() => {
  const storedEmail = localStorage.getItem('email');
  const storedRememberUser = localStorage.getItem('rememberUser');
  email.value = storedEmail ?? '';
  rememberUser.value = storedRememberUser == 'true';
});
</script>

<template>
  <form @submit.prevent="submitForm">
    <div class="form-field">
      <div class="d-flex flex-column gap-1">
        <h1 class="mb-0">Welcome back</h1>
        <p class="text-body-secondary mb-0">
          Log in with your SMU account to pick up where you left off.
        </p>
      </div>
      <div>
        <label for="login-email" class="form-label small fw-semibold">SMU email</label>
        <div class="position-relative">
          <i
            class="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
            aria-hidden="true"
          ></i>
          <input
            id="login-email"
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
        <label for="login-password" class="form-label small fw-semibold">Password</label>
        <PasswordInput
          id="login-password"
          v-model="password"
          lock-icon
          autocomplete="current-password"
          placeholder="••••••••••"
        />
      </div>
      <div class="form-check mb-0">
        <input id="login-remember" class="form-check-input" type="checkbox" v-model="rememberUser" />
        <label class="form-check-label fw-normal" for="login-remember">Remember my email</label>
      </div>
      <div class="d-flex flex-column gap-3">
        <div v-if="errorMessage" class="form-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span role="alert">{{ errorMessage }}</span>
        </div>
        <button type="submit" class="btn btn-primary btn-auth" :disabled="busy">
          <span v-if="busy" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          {{ busy ? 'Logging in…' : 'Log in' }}
        </button>
      </div>
      <p class="form-switch-line">
        New to TechTrek?
        <button type="button" class="btn btn-link" @click="$emit('switch-to-signup')">Create an account</button>
      </p>
    </div>
  </form>
</template>
