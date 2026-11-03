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

function sameOriginPath(target) {
  return typeof target === 'string' && /^\/(?![/\\])/.test(target) ? target : '/home';
}

async function submitForm() {
  errorMessage.value = '';
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
      <p v-if="errorMessage" class="errors">{{ errorMessage }}</p>
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
        <div class="position-relative">
          <i
            class="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
            aria-hidden="true"
          ></i>
          <input
            id="login-password"
            type="password"
            class="form-control ps-5"
            v-model="password"
            autocomplete="current-password"
            placeholder="••••••••••"
          />
        </div>
      </div>
      <div class="form-check">
        <input
          id="login-remember"
          class="form-check-input"
          type="checkbox"
          v-model="rememberUser"
        />
        <label class="form-check-label fw-normal" for="login-remember">Remember me</label>
      </div>
      <p v-if="errorMessage" class="errors mb-0" role="alert">{{ errorMessage }}</p>
      <button type="submit" class="btn btn-primary fw-semibold">Log in</button>
      <p
        class="d-flex align-items-center gap-2 bg-primary-subtle text-primary rounded-2 small fw-medium px-3 py-2 mb-0"
      >
        <i class="bi bi-lock" aria-hidden="true"></i>
        Sign-up is limited to @smu.edu.sg emails.
      </p>
      <div class="d-flex justify-content-center">
        <a
          href="#"
          class="small text-body-secondary link-underline link-underline-opacity-0 link-underline-opacity-100-hover"
          @click.prevent="$emit('switch-to-signup')"
          >New to TechTrek? Create an account</a
        >
      </div>
    </div>
  </form>
</template>
