<script setup>
import { ref } from 'vue';
import LoginPanel from '@/components/login/LoginPanel.vue';
import SignUpPanel from '@/components/login/SignUpPanel.vue';
const isLogin = ref(true);

function switchToLogin() {
  isLogin.value = true;
}

function switchToSignUp() {
  isLogin.value = false;
}
</script>

<template>
  <div class="row g-0 min-vh-100">
    <!-- banner, only from md up; on phones the form takes the whole screen -->
    <div id="banner" class="col-md-6 d-none d-md-flex bg-primary text-white p-4 p-lg-5">
      <div style="max-width: 440px">
        <div class="d-flex align-items-center gap-2 mb-4">
          <i class="bi bi-bootstrap-fill fs-1"></i>
          <span class="fs-1 fw-bold">TechTrek</span>
        </div>
        <h2 class="fw-bold mb-3">Your trek into tech starts here.</h2>
        <p class="mb-4 opacity-75">Everything you need for internships, hackathons and interviews, in one place.</p>
        <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
          <li><i class="bi bi-compass me-2"></i>Discover internships, jobs and hackathons</li>
          <li><i class="bi bi-clipboard-data me-2"></i>Track every application and deadline</li>
          <li><i class="bi bi-people me-2"></i>Find teammates for your next hackathon</li>
          <li><i class="bi bi-chat-left me-2"></i>Practise interviews with AI feedback</li>
        </ul>
      </div>
    </div>
    <div
      id="loginPanel"
      class="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center px-3 py-4 py-sm-5"
    >
      <div id="brandHeader" class="d-flex d-md-none align-items-center gap-2 mb-4">
        <span
          class="brand-tile d-flex align-items-center justify-content-center rounded-3 bg-primary text-white"
        >
          <i class="bi bi-bootstrap-fill" aria-hidden="true"></i>
        </span>
        <span class="fs-3 fw-bold text-primary">TechTrek</span>
      </div>
      <div id="panel" class="p-4 p-sm-5 p-md-4 p-lg-5">
        <div id="slider">
          <button class="slider-button btn" :class="{selected : isLogin}" @click="switchToLogin()">Log in</button>
          <button class="slider-button btn" :class="{selected : !isLogin}" @click="switchToSignUp()">Sign up</button>
        </div>
        <LoginPanel v-show="isLogin" @switch-to-signup="switchToSignUp()"/>
        <SignUpPanel v-show="!isLogin"/>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
#banner {
  display: flex;
  justify-content: center;
  align-items: center;
}

.brand-tile {
  width: 40px;
  height: 40px;
  font-size: 1.25rem;
}

/* the card grows with its form, so the buttons never spill out of it */
#panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  background-color: white;
  gap: 2rem;
  border-radius: var(--bs-border-radius);
  box-shadow: 0px 10px 25px 0px rgba(0, 0, 0, 0.15);
}

#slider {
  background-color: #F6F3DA;
  border-radius: var(--bs-border-radius);
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
}

.slider-button {
  margin: 5px;
  border-radius: var(--bs-border-radius);
  width: 50%;
  font-weight: bold;
}

.selected {
  background-color: white;
  box-shadow:0px 1px 3px 0px rgba(0, 0, 0, 0.15);
}
</style>
