<script setup lang="js">
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import ProfileMenu from './profile-menu/ProfileMenu.vue';

// shortLabel is used in the bottom bar on phones and tablets, where there is less room
const appRoutes = [
  { label: 'Home', shortLabel: 'Home', location: '/', icon: 'bi-house' },
  { label: 'Opportunities', shortLabel: 'Discover', location: '/opportunities', icon: 'bi-compass' },
  { label: 'Tracker', shortLabel: 'Tracker', location: '/tracker', icon: 'bi-clipboard-data' },
  { label: 'Teams', shortLabel: 'Teams', location: '/teams', icon: 'bi-people' },
  { label: 'Interview Prep', shortLabel: 'Prep', location: '/interview', icon: 'bi-chat-left' }
]

const location = useRoute()
const collapsed = ref(false)
</script>

<template>
  <!-- sidebar, only from lg up -->
  <div class="d-none d-lg-flex flex-column vh-100 sticky-top flex-shrink-0 bg-primary text-white p-3" id="sidebar" :style="{ width: collapsed ? '80px' : '260px' }" style="transition: width .2s;">

    <div class="d-flex align-items-center justify-content-between" :class="{ 'flex-column gap-2': collapsed }">
      <RouterLink to="/" class="d-flex align-items-center text-decoration-none">
        <i class="bi bi-bootstrap-fill text-white fs-3" :class="{ 'me-2': !collapsed }"></i>
        <span v-show="!collapsed" class="fs-2 fw-bold text-white">TechTrek</span>
      </RouterLink>

      <button class="btn btn-sm text-white fw-bold border-0" type="button" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="collapsed = !collapsed">
        <i class="bi fs-3" :class="collapsed ? 'bi-chevron-bar-right' : 'bi-chevron-bar-left'"></i>
      </button>
    </div>

    <ul class="nav nav-pills flex-column mb-auto mt-4">
      <li v-show="!collapsed"><span class="nav-item ms-2 text-white fs-6">MENU</span></li>
      <li v-for="route in appRoutes" class="nav-item mt-1 fw-medium" :key="route.location">
        <RouterLink :to="route.location" :title="collapsed ? route.label : null" :class="['nav-link', { 'text-center px-0': collapsed }, location.path === route.location ? 'bg-body text-primary' : 'text-white']" aria-current="page">
          <i :class="`bi ${route.icon} fs-3`" class="align-middle" :style="{ marginRight: collapsed ? 0 : '.5rem' }"></i>
          <span v-show="!collapsed">{{ route.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <ProfileMenu />

  </div>

  <!-- bottom tab bar, only below lg -->
  <nav class="bottom-nav d-flex d-lg-none fixed-bottom bg-white border-top" aria-label="Main menu">
    <RouterLink
      v-for="route in appRoutes"
      :key="route.location"
      :to="route.location"
      class="bottom-nav-link d-flex flex-column align-items-center flex-fill text-decoration-none small fw-medium"
      :class="location.path === route.location ? 'text-primary' : 'text-body-secondary'"
      :aria-current="location.path === route.location ? 'page' : null"
    >
      <!-- the active tab's icon sits in a light blue pill -->
      <span class="bottom-nav-icon rounded-pill" :class="{ 'bg-primary-subtle': location.path === route.location }">
        <i :class="`bi ${route.icon}`" aria-hidden="true"></i>
      </span>
      {{ route.shortLabel }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  padding: 8px 4px calc(8px + env(safe-area-inset-bottom)); /* clears the iPhone home bar */
}

.bottom-nav-link {
  gap: 2px;
}

.bottom-nav-icon {
  padding: 2px 16px;
  font-size: 20px;
  line-height: 28px;
}
</style>
