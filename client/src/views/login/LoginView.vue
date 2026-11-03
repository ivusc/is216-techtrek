<script setup>
import { ref } from 'vue';
import LoginPanel from '@/components/login/LoginPanel.vue';
import SignUpPanel from '@/components/login/SignUpPanel.vue';
const isLogin = ref(true);

const features = [
  {
    title: 'Discover',
    description: 'Adzuna jobs + open hackathons, filtered for you',
    icon: 'bi-compass',
  },
  { title: 'Track', description: 'A board and calendar for every deadline', icon: 'bi-kanban' },
  { title: 'Team up', description: 'Find teammates with the skills you need', icon: 'bi-people' },
  { title: 'Practise', description: 'Interview answers graded by AI', icon: 'bi-chat-left' },
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
    <!-- banner, only from md up; on phones the form takes the whole screen -->
    <div
      id="banner"
      class="col-md-6 d-none d-md-flex flex-column align-items-start bg-primary text-white position-relative overflow-hidden"
    >
      <span class="circle circle-teal d-none d-lg-block" aria-hidden="true"></span>
      <span class="circle circle-peach d-none d-xl-block" aria-hidden="true"></span>
      <span class="circle circle-coral d-none d-xl-block" aria-hidden="true"></span>

      <div class="d-flex align-items-center gap-2 position-relative">
        <span class="logo-tile logo-tile-cream">
          <img src="@/assets/logo.svg" alt="" width="22" height="22" />
        </span>
        <span class="h3 mb-0 text-white">TechTrek</span>
      </div>

      <div class="banner-copy position-relative my-auto py-5">
        <h2 class="display-1 text-white mb-4">Every tech opportunity at SMU, in one place.</h2>
        <p class="banner-sub mb-4">
          Internships, hackathons and competitions from across the web — with a tracker, teammate
          finder and interview practice built in.
        </p>
        <ul class="list-unstyled d-flex flex-column gap-3 mb-0 pt-2">
          <li
            v-for="feature in features"
            :key="feature.title"
            class="d-flex align-items-center gap-3"
          >
            <span class="feature-tile">
              <i :class="`bi ${feature.icon}`" aria-hidden="true"></i>
            </span>
            <span>
              <span class="d-block fw-semibold">{{ feature.title }}</span>
              <span class="d-none d-lg-block small text-white text-opacity-75">{{
                feature.description
              }}</span>
            </span>
          </li>
        </ul>
      </div>

      <p class="banner-footer text-caption position-relative mb-0">IS216 · G10 · Team TechTrek</p>
    </div>
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
        <LoginPanel v-show="isLogin" @switch-to-signup="switchToSignUp()" />
        <SignUpPanel v-show="!isLogin" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
#banner {
  padding: 1.5rem;
}

.circle {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
}

.circle-teal {
  width: 61.76%;
  top: 0;
  right: -17.65%;
  transform: translateY(-33.33%);
  background-color: var(--bs-info);
}

.circle-peach {
  width: 32.35%;
  top: 54.69%;
  right: -8.82%;
  background-color: var(--tt-peach);
}

.circle-coral {
  width: 17.65%;
  top: 48.83%;
  left: 69.12%;
  background-color: var(--tt-accent);
}

.logo-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--bs-border-radius);
}

.logo-tile-cream {
  background-color: var(--tt-cream);
}

.banner-copy h2 {
  max-width: 500px;
}

.banner-sub {
  max-width: 460px;
  color: rgba(255, 255, 255, 0.85);
}

.feature-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 1.25rem;
  color: var(--tt-cream);
  background-color: rgba(255, 255, 255, 0.14);
}

.banner-footer {
  color: rgba(255, 255, 255, 0.6);
}

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

@media (min-width: 992px) {
  #banner {
    padding: 3rem;
  }
}

@media (min-width: 1400px) {
  #banner {
    width: 47.22%;
    padding: 4rem;
  }

  #loginPanel {
    width: 52.78%;
  }
}
</style>
