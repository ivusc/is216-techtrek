<script setup lang="js">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import './profile-menu.css';
import { useUserStore } from '@/store/user';

const router = useRouter();
const authStore = useUserStore();

// the name from onboarding, else the part of the SMU email before the @
const displayName = computed(() => authStore.displayName || (authStore.username ?? '').split('@')[0]);
const initial = computed(() => displayName.value.charAt(0).toUpperCase() || '?');

async function signOut() {
  await authStore.logout();
  router.push('/login');
}
const profileRoutes = [
  { label: 'Settings', location: '/profile/settings', icon: 'bi-gear' },
  { label: 'Profile', location: '/profile', icon: 'bi-person-circle' },
];
const collapsed = ref(false);
</script>

<template>
  <div class="dropup">
    <button
      type="button"
      class="btn border-0 p-0 d-flex align-items-center gap-2 w-100 text-start text-white dropdown-toggle"
      id="profile"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :aria-label="collapsed ? 'Open profile menu' : null"
    >
      <span
        class="profile-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        >{{ initial }}</span
      >
      <span v-show="!collapsed" class="d-flex flex-column flex-grow-1 lh-sm">
        <strong class="small">{{ displayName }}</strong>
        <span class="small fw-medium">{{ authStore.faculty ?? authStore.username }}</span>
      </span>
    </button>

    <ul class="dropdown-menu profile-menu" aria-labelledby="profile">
      <li v-for="route in profileRoutes" :key="route.location">
        <RouterLink class="dropdown-item" :to="route.location">
          <i :class="`bi ${route.icon}`" aria-hidden="true"></i>
          {{ route.label }}
        </RouterLink>
      </li>
      <li><hr class="dropdown-divider" /></li>
      <li>
        <button type="button" class="dropdown-item sign-out" @click="signOut">
          <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
          Sign out
        </button>
      </li>
    </ul>
  </div>
</template>
