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
      <div>
        <h1>Welcome back!</h1>
        <p>Log in with your SMU account to pick up where you left off.</p>
      </div>
      <div>
        <label for="login-email" class="form-label">SMU Email</label>
        <input
          id="login-email"
          type="email"
          class="form-control"
          v-model="email"
          autocomplete="username"
          inputmode="email"
          placeholder="✉ john.doe.2025@smu.edu.sg"
        />
      </div>
      <div>
        <label for="login-password" class="form-label">Password</label>
        <input
          id="login-password"
          type="password"
          class="form-control"
          v-model="password"
          autocomplete="current-password"
          placeholder="🔒︎ **********"
        />
      </div>
      <div class="form-check">
        <input id="login-remember" class="form-check-input" type="checkbox" v-model="rememberUser" />
        <label class="form-check-label" for="login-remember"> Remember me </label>
      </div>
      <p v-if="errorMessage" class="errors mb-0" role="alert">{{ errorMessage }}</p>
      <button type="submit" class="btn btn-primary">Log in</button>
      <div class="d-flex justify-content-center">
        <a
          href="#"
          class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover"
          style="color: grey"
          @click.prevent="$emit('switch-to-signup')"
          >New to TechTrek? Create an account</a
        >
      </div>
    </div>
  </form>
</template>
