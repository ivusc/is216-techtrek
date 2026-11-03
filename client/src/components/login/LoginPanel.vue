<script setup>
import '@/views/login/LoginView.css';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';

defineEmits(['switch-to-signup']);

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const email = ref('');
const password = ref('');
const rememberUser = ref(false);
const errorMessage = ref('');

async function submitForm() {
  if (email.value.includes('@') == false || email.value.split('@')[1] != 'smu.edu.sg') {
    errorMessage.value = 'Please enter a valid SMU email.';
    password.value = '';
    return;
  }

  const cleanEmail = email.value.trim().toLowerCase();

  try {
    await userStore.login(cleanEmail, password.value);

    if (rememberUser.value) {
      localStorage.setItem('email', email.value);
      localStorage.setItem('rememberUser', true);
    } else {
      localStorage.removeItem('email');
    }
    errorMessage.value = '';
    // go back to the page the guard sent us away from, if there was one
    router.push(route.query.redirect ?? '/home');
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
      <div>
        <h1 class="form-title">Welcome back</h1>
        <p class="form-subtitle">Log in with your SMU account to pick up where you left off.</p>
      </div>
      <p v-if="errorMessage" class="errors">{{ errorMessage }}</p>
      <div>
        <label for="login-email" class="form-label">SMU email</label>
        <div class="icon-input">
          <i class="bi bi-envelope"></i>
          <input
            id="login-email"
            type="email"
            class="form-control"
            v-model="email"
            autocomplete="username"
            placeholder="john.doe.2025@smu.edu.sg"
          />
        </div>
      </div>
      <div>
        <label for="login-password" class="form-label">Password</label>
        <div class="icon-input">
          <i class="bi bi-lock"></i>
          <input
            id="login-password"
            type="password"
            class="form-control"
            v-model="password"
            autocomplete="current-password"
            placeholder="••••••••••"
          />
        </div>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <div class="form-check mb-0">
          <input id="remember-me" class="form-check-input" type="checkbox" v-model="rememberUser" />
          <label class="form-check-label small fw-medium" for="remember-me">Remember me</label>
        </div>
        <a href="#" class="small fw-semibold text-decoration-none" @click.prevent>Forgot password?</a>
      </div>
      <button type="submit" class="btn btn-primary fw-semibold">Log in</button>
      <p class="form-note mb-0">
        <i class="bi bi-lock"></i>
        Sign-up is limited to @smu.edu.sg emails.
      </p>
      <p class="text-center small text-body-secondary mb-0">
        New to TechTrek?
        <a href="#" class="text-body-secondary" @click.prevent="$emit('switch-to-signup')">Create an account</a>
      </p>
    </div>
  </form>
</template>
