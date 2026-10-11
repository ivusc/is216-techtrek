<script setup lang="js">
import { ref } from 'vue';
import './profile-menu.css'

const profileRoutes = [
  { label: 'Settings', location: '/profile/settings', icon: 'bi-gear' },
  { label: 'Profile', location: '/profile', icon: 'bi-person-circle' }
]
const collapsed = ref(false)

</script>

<template>
  <div class="dropup">
      <button type="button" class="btn border-0 p-0 d-flex align-items-center gap-2 w-100 text-start text-white dropdown-toggle" id="profile" data-bs-toggle="dropdown" aria-expanded="false" :aria-label="collapsed ? 'Open profile menu' : null">
        <span class="profile-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">JD</span>
        <span v-show="!collapsed" class="d-flex flex-column flex-grow-1 lh-sm">
          <strong class="small">John</strong>
          <span class="small fw-medium">Y1 · Info Systems</span>
        </span>
      </button>

      <ul class="dropdown-menu profile-menu" aria-labelledby="profile">
        <li v-for="route in profileRoutes" :key="route.location">
          <RouterLink class="dropdown-item" :to="route.location">
            <i :class="`bi ${route.icon}`" aria-hidden="true"></i>
            {{ route.label }}
          </RouterLink>
        </li>
        <li><hr class="dropdown-divider"></li>
        <li>
          <RouterLink class="dropdown-item sign-out" to="#">
            <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
            Sign out
          </RouterLink>
        </li>
      </ul>
    </div>
</template>