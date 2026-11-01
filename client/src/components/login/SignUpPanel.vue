<script setup>
import '@/views/login/LoginView.css';
import { ref } from 'vue';
import axios from 'axios';
import router from '@/router';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
const email = ref("");
const password = ref("");
const reEnteredPassword = ref("");
const errorMessage = ref("");

async function submitForm() {
  if (email.value.includes("@") == false || (email.value.split('@'))[1] != "smu.edu.sg") {
    errorMessage.value = "Please enter a valid SMU email.";
    return;
  }
  if (reEnteredPassword.value != password.value) {
    errorMessage.value = "The passwords don't match!";
    return;
  }
  if (password.value.trim().length < 8) {
    errorMessage.value = "Your password should be at least 8 charcters long with 1 number, uppercase alphabet and symbol.";
    return;
  }
  const regex1 = /[^a-zA-Z0-9 ]/;
  const regex2 = /\d/;
  const regex3 = /[A-Z]/;
  if (!regex1.test(password.value)) {
    errorMessage.value = "Your password should be at least 1 symbol.";
    return;
  }
  if (!regex2.test(password.value)) {
    errorMessage.value = "Your password should be at least 1 digit.";
    return;
  }
  if (!regex3.test(password.value)) {
    errorMessage.value = "Your password should be at least 1 uppercase letter.";
    return;
  }
  const cleanEmail = email.value.trim().toLowerCase();
  const body = {
    userName : cleanEmail,
    password : password.value
  }
  try {
    await axios.post("http://localhost:8000/register", body);
    authStore.username = cleanEmail;
    authStore.isLoggedIn = true;
    router.push("/opportunities");
  } catch (err) {
    switch (err.status) {
      case 400 :
        errorMessage.value = "This email is already in use.";
        break;
      case 500 :
        errorMessage.value = "Something unexpected went wrong. Please try again.";
        break;
      default :
        errorMessage.value = "Something extremely unique has happened. Hurry grab the camera!!!";
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
      <label for="" class="form-label" >Your SMU Email</label>
      <input type="email" class="form-control" v-model="email" aria-describedby="emailHelpId" placeholder="✉ john.doe.2025@smu.edu.sg"/>
    </div>
    <div>
      <label for="" class="form-label">Password</label>
      <input type="password" class="form-control" v-model="password" placeholder="🔒︎ **********"/>
      <small>Your password should include at least 1 number, uppercase alphabet and symbol</small>
      <br>
      <label for="" class="form-label">Re-Enter Password</label>
      <input type="password" class="form-control" v-model="reEnteredPassword" placeholder="🔒︎ **********"/>
    </div>
    <div>
      <p class="errors">{{ errorMessage }}</p>
    </div>
    <button type="submit" class="btn btn-primary">Create account</button>
  </div>
</form>
</template>

<style lang="scss" scoped>

</style>
