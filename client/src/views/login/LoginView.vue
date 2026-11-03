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
  <div class="row g-0 h-100">
    <BrandBanner>
      <h2 class="banner-title display-1 text-white mb-4">Every tech opportunity at SMU, in one place.</h2>
      <p class="banner-text mb-4">
        Internships, hackathons and competitions from across the web — with a tracker, teammate
        finder and interview practice built in.
      </p>
      <ul class="list-unstyled d-flex flex-column gap-3 mb-0 pt-2">
        <li v-for="feature in features" :key="feature.title" class="d-flex align-items-center gap-3">
          <span class="feature-icon">
            <i :class="`bi ${feature.icon}`" aria-hidden="true"></i>
          </span>
          <span>
            <span class="d-block fw-semibold">{{ feature.title }}</span>
            <span class="feature-text d-none d-lg-block small">{{ feature.text }}</span>
          </span>
        </li>
      </ul>
    </BrandBanner>
    <div
      id="loginPanel"
      class="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center px-3 py-4 py-sm-5"
    >
      <div id="brandHeader" class="d-flex d-md-none align-items-center gap-2 mb-4">
        <span class="logo-tile bg-white shadow-sm">
          <img src="@/assets/logo.svg" alt="" width="22" height="22" />
        </span>
        <span class="h3 mb-0">TechTrek</span>
      </div>
      <div id="panel" class="shadow">
        <div id="slider">
          <button
            type="button"
            class="slider-button btn"
            :class="{ selected: isLogin }"
            :aria-pressed="isLogin"
            @click="switchToLogin()"
          >
            Log in
          </button>
          <button
            type="button"
            class="slider-button btn"
            :class="{ selected: !isLogin }"
            :aria-pressed="!isLogin"
            @click="switchToSignUp()"
          >
            Sign up
          </button>
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
  padding: 1.5rem;
  gap: 1.25rem;
  border-radius: 20px;
}

/* logo on phones, where the banner is hidden */
.logo-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--bs-border-radius);
}

#slider {
  display: flex;
  gap: 4px;
  padding: 4px;
  background-color: var(--bs-secondary-bg);
  border-radius: var(--bs-border-radius);
}

.slider-button {
  flex: 1;
  padding: 7px 14px;
  border: 0;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
}

.selected,
.selected:hover {
  color: var(--bs-body-color);
  background-color: white;
  box-shadow:
    0 2px 3px rgba(18, 52, 63, 0.06),
    0 1px 1px rgba(18, 52, 63, 0.06);
}

@media (min-width: 576px) and (max-width: 767.98px), (min-width: 992px) {
  #panel {
    padding: 2.5rem;
  }
}

@media (min-width: 1400px) {
  #loginPanel {
    width: 52.78%;
  }
}
</style>
