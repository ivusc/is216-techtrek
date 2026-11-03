<script setup>
import { ref } from 'vue';
import LoginPanel from '@/components/login/LoginPanel.vue';
import SignUpPanel from '@/components/login/SignUpPanel.vue';
import BrandBanner from '@/components/login/BrandBanner.vue';
const isLogin = ref(true);

// the 4 things TechTrek does, shown on the banner (same icons as the sidebar)
const features = [
  { title: 'Discover', text: 'Adzuna jobs + open hackathons, filtered for you', icon: 'bi-compass' },
  { title: 'Track', text: 'A board and calendar for every deadline', icon: 'bi-clipboard-data' },
  { title: 'Team up', text: 'Find teammates with the skills you need', icon: 'bi-people' },
  { title: 'Practise', text: 'Interview answers graded by AI', icon: 'bi-chat-left' },
];

function switchToLogin() {
  isLogin.value = true;
}

function switchToSignUp() {
  isLogin.value = false;
}
</script>

<template>
  <div class="row g-0 min-vh-100">
    <BrandBanner>
      <h1 class="banner-title fw-bold text-white mb-3">Every tech opportunity at SMU, in one place.</h1>
      <p class="banner-text mb-4">
        Internships, hackathons and competitions from across the web — with a tracker, teammate finder and
        interview practice built in.
      </p>
      <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
        <li v-for="feature in features" :key="feature.title" class="d-flex align-items-center gap-3">
          <span class="feature-icon rounded-2 d-flex align-items-center justify-content-center flex-shrink-0">
            <i :class="`bi ${feature.icon}`"></i>
          </span>
          <span class="d-flex flex-column lh-sm">
            <strong class="small">{{ feature.title }}</strong>
            <span class="feature-text">{{ feature.text }}</span>
          </span>
        </li>
      </ul>
    </BrandBanner>

    <div id="loginPanel" class="col-12 col-lg-6 d-flex justify-content-center align-items-center py-5 px-3">
      <div id="panel">
        <div id="slider">
          <button class="slider-button btn" :class="{selected : isLogin}" @click="switchToLogin()">Log in</button>
          <button class="slider-button btn" :class="{selected : !isLogin}" @click="switchToSignUp()">Sign up</button>
        </div>
        <LoginPanel v-show="isLogin" @switch-to-signup="switchToSignUp()"/>
        <SignUpPanel v-show="!isLogin" @switch-to-login="switchToLogin()"/>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* the card grows with its form, so the buttons never spill out of it */
#panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  background-color: white;
  padding: 2rem;
  gap: 1.5rem;
  border-radius: 16px;
  box-shadow: 0px 10px 25px 0px rgba(0, 0, 0, 0.08);
}

#slider {
  background-color: #F6F3DA;
  border-radius: var(--bs-border-radius);
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
}

.slider-button {
  margin: 4px;
  border-radius: var(--bs-border-radius);
  width: 50%;
  font-size: 14px;
  font-weight: 600;
}

.selected {
  background-color: white;
  box-shadow:0px 1px 3px 0px rgba(0, 0, 0, 0.15);
}
</style>
