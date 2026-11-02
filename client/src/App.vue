<script setup>
import SideBar from './components/SideBar.vue';
import { useUserStore } from '@/store/user.js';

const authStore = useUserStore();
</script>

<template>
  <div class="d-flex vh-100">
    <SideBar v-if="authStore.isLoggedIn" />
    <main class="app-main flex-grow-1 p-3 p-md-4" style="min-width: 0">
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
