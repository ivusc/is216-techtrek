<script setup>
import '@/views/login/LoginView.css';
import { onMounted, ref } from 'vue';
import axios from 'axios';
import router from '@/router';
const email = ref("");
const password = ref("");
const rememberUser = ref(false);
const errorMessage = ref("");

async function submitForm() {
  if (email.value.includes("@") == false || (email.value.split('@'))[1] != "smu.edu.sg") {
    errorMessage.value = "Please enter a valid SMU email.";
    password.value = "";
    return;
  }

  const body = {
    userName : email.value.trim().toLowerCase(),
    password : password.value,
  };

  try {
    await axios.post("http://localhost:8000/login", body);

    if (rememberUser.value) {
      localStorage.setItem("email", email.value);
      localStorage.setItem("rememberUser", true);
    } else {
      localStorage.removeItem("email");
    }
    router.push("/opportunities");
  } catch (err) {
    switch (err.status) {
      case 404 :
        errorMessage.value = "This email has not been registered with us. Click on Sign up to create an account!";
        break;
      case 401 :
        errorMessage.value = "Wrong password!"
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
  password.value = "";
}

onMounted(()=> {
  const storedEmail = localStorage.getItem("email");
  const storedRememberUser = localStorage.getItem("rememberUser");
  email.value = storedEmail ?? "";
  rememberUser.value = storedRememberUser == "true";
})
</script>

<template>
<form @submit.prevent="submitForm">
  <div class="form-field">
    <div>
      <h1>Welcome back!</h1>
      <p>Log in with your SMU account to pick up where you left off.</p>
    </div>
    <div>
      <p class="errors">{{ errorMessage }}</p>
    </div>
    <div>
      <label for="" class="form-label">SMU Email</label>
      <input type="email" class="form-control" v-model="email" aria-describedby="emailHelpId" placeholder="✉ john.doe.2025@smu.edu.sg"/>
    </div>
    <div>
      <label for="" class="form-label">Password</label>
      <input type="password" class="form-control" v-model="password" placeholder="🔒︎ **********"/>
    </div>
    <div id="extras">
      <div class="form-check">
        <input class="form-check-input" type="checkbox" v-model="rememberUser" />
        <label class="form-check-label" for=""> Remember me </label>
      </div>
      <a href="" class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" style="font-weight: bold;">Forgot password?</a>
    </div>
    <button type="submit" class="btn btn-primary">Log in</button>
    <div class="d-flex justify-content-center">
      <a href="" class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" style="color: grey;">New to TechTrek? Create an  account</a>
    </div>
  </div>
</form>
</template>

<style lang="scss" scoped>
#extras {
  display: flex;
  justify-content:space-between;
}
</style>
