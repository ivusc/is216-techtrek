<script setup lang="js">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import './profile-menu.css';
import { useUserStore } from '@/store/user';
import UserAvatar from '@/components/UserAvatar.vue';

defineProps({ collapsed: { type: Boolean, default: false } });

const router = useRouter();
const authStore = useUserStore();

const displayName = computed(() => authStore.displayName ?? '');

async function signOut() {
  await authStore.logout();
  router.push('/login');
}
const profileRoutes = [{ label: 'Profile', location: '/profile', icon: 'bi-person-circle' }];
</script>

<template>
  <div class="dropup">
    <button
      type="button"
      class="btn border-0 p-0 d-flex align-items-center gap-2 w-100 text-start text-body dropdown-toggle profile-toggle"
      id="profile"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :aria-label="collapsed ? 'Open profile menu' : null"
    >
      <UserAvatar
        :user-id="authStore._id ?? ''"
        :name="displayName"
        :avatar-updated-at="authStore.avatarUpdatedAt"
        :size="36"
        class="bg-primary text-white"
      />
      <span v-if="!collapsed" class="d-flex flex-column flex-grow-1 lh-sm" style="min-width: 0">
        <strong class="small text-truncate" :title="displayName">{{ displayName }}</strong>
        <span
          class="small text-body-secondary text-truncate"
          :title="authStore.faculty ?? authStore.username"
          >{{ authStore.faculty ?? authStore.username }}</span
        >
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
