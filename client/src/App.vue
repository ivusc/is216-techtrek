<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SideBar from './components/SideBar.vue';
import { useUserStore } from '@/store/user.js';

const authStore = useUserStore();
const route = useRoute();

// the sidebar and page padding only show inside the app, not on login or onboarding
const showNav = computed(() => authStore.isLoggedIn && !route.meta.fullScreen);
</script>

<template>
  <!-- the page itself never scrolls: the sidebar stays put and only <main> scrolls -->
  <div class="d-flex vh-100 overflow-hidden">
    <SideBar v-if="showNav" />
    <!-- login and onboarding go edge to edge, so the padding is only added with the sidebar -->
    <main class="flex-grow-1 overflow-y-auto" :class="{ 'app-main p-3 p-md-4': showNav }" style="min-width: 0">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* below lg, leave room so the bottom tab bar doesn't cover the end of the page */
@media (max-width: 991.98px) {
  .app-main {
    padding-bottom: 96px !important;
  }
}
</style>
