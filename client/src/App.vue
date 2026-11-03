<script setup>
import SideBar from './components/SideBar.vue';
import { useUserStore } from '@/store/user.js';

const authStore = useUserStore();
</script>

<template>
  <div class="d-flex vh-100">
    <SideBar v-if="authStore.isLoggedIn" />
    <main class="app-main flex-grow-1 overflow-y-auto p-3 p-md-4" style="min-width: 0">
      <div
        v-if="!authStore.hasCheckedSession"
        class="d-flex flex-column justify-content-center align-items-center gap-3 h-100 text-body-secondary"
        role="status"
      >
        <span class="spinner-border text-primary" aria-hidden="true"></span>
        Loading TechTrek…
      </div>
      <RouterView v-else />
    </main>
  </div>
</template>

<style scoped>
/* below md, leave room so the bottom tab bar doesn't cover the end of the page */
@media (max-width: 767.98px) {
  .app-main {
    padding-bottom: 96px !important;
  }
}
</style>
