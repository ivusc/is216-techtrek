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
        <h1>Welcome to Tech Trek!</h1>
        <p>Create an account using your SMU email to being your trek into tech!</p>
      </div>
      <div>
        <p></p>
      </div>
      <div>
        <label for="signup-email" class="form-label">Your SMU Email</label>
        <input
          id="signup-email"
          type="email"
          class="form-control"
          v-model="email"
          autocomplete="username"
          inputmode="email"
          placeholder="✉ john.doe.2025@smu.edu.sg"
        />
      </div>
      <div>
        <label for="signup-password" class="form-label">Password</label>
        <input
          id="signup-password"
          type="password"
          class="form-control"
          v-model="password"
          autocomplete="new-password"
          placeholder="🔒︎ **********"
        />
        <small>Your password should include at least 1 number, uppercase alphabet and symbol</small>
        <br />
        <label for="signup-confirm" class="form-label">Re-Enter Password</label>
        <input
          id="signup-confirm"
          type="password"
          class="form-control"
          v-model="reEnteredPassword"
          autocomplete="new-password"
          placeholder="🔒︎ **********"
        />
      </div>
      <div>
        <p class="errors">{{ errorMessage }}</p>
      </div>
      <button type="submit" class="btn btn-primary">Create account</button>
    </div>
  </form>
</template>

<style lang="scss" scoped></style>
