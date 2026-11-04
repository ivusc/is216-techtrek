<script setup>
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import SideBar from './components/SideBar.vue';
import { useUserStore } from '@/store/user.js';
import { useNotificationStore } from '@/store/notifications.js';

const authStore = useUserStore();
const route = useRoute();
// no sidebar on full-screen pages (login, onboarding)
const showSideBar = computed(() => authStore.isLoggedIn && !route.meta.bare);

// notifications are checked in the background while someone is logged in
const notificationStore = useNotificationStore();
watch(
  () => authStore.isLoggedIn,
  (loggedIn) => (loggedIn ? notificationStore.start() : notificationStore.stop()),
  { immediate: true },
);
</script>

<template>
  <div class="d-flex vh-100">
    <SideBar v-if="showSideBar" />
    <main
      class="app-main flex-grow-1"
      :class="{ 'overflow-y-auto': !route.meta.noScroll, 'overflow-hidden': route.meta.noScroll, 'p-3 p-md-4': !route.meta.bare, 'with-tab-bar': showSideBar }"
      style="min-width: 0"
    >
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
  .app-main.with-tab-bar {
    padding-bottom: 96px !important;
  }
}
</style>
