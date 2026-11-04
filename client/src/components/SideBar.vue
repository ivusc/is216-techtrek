<script setup lang="js">
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import ProfileMenu from './profile-menu/ProfileMenu.vue';

// shortLabel is used in the bottom bar on phones and tablets, where there is less room
const appRoutes = [
  { label: 'Home', shortLabel: 'Home', location: '/home', icon: 'bi-house' },
  { label: 'Opportunities', shortLabel: 'Discover', location: '/opportunities', icon: 'bi-compass' },
  { label: 'Tracker', shortLabel: 'Tracker', location: '/tracker', icon: 'bi-clipboard-data' },
  { label: 'Teams', shortLabel: 'Teams', location: '/teams', icon: 'bi-people' },
  { label: 'Interview Prep', shortLabel: 'Prep', location: '/interview', icon: 'bi-chat-left' }
]

const location = useRoute()
const collapsed = ref(window.matchMedia('(max-width: 991.98px)').matches)
</script>

<template>
  <!-- sidebar, only from md up: white with a thin border, purple highlight on the current page -->
  <div class="d-none d-md-flex flex-column vh-100 sticky-top flex-shrink-0 bg-white border-end py-3" id="sidebar" :style="{ width: collapsed ? '80px' : '260px' }" style="transition: width .2s;">

    <div class="d-flex align-items-center justify-content-between px-3" :class="{ 'flex-column gap-2': collapsed }">
      <RouterLink to="/home" class="d-flex align-items-center text-decoration-none" :aria-label="collapsed ? 'TechTrek home' : null">
        <span class="brand-mark d-inline-flex align-items-center justify-content-center rounded-3 bg-primary text-white" :class="{ 'me-2': !collapsed }">
          <i class="bi bi-compass-fill"></i>
        </span>
        <span v-show="!collapsed" class="brand-name fw-bold text-body">TechTrek<span class="text-primary">.</span></span>
      </RouterLink>

      <button class="btn btn-sm text-body-secondary border-0" type="button" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="collapsed = !collapsed">
        <i class="bi fs-5" :class="collapsed ? 'bi-chevron-bar-right' : 'bi-chevron-bar-left'"></i>
      </button>
    </div>

    <ul class="nav flex-column mb-auto mt-4">
      <li v-show="!collapsed"><span class="menu-label text-body-tertiary ms-4">MENU</span></li>
      <li v-for="route in appRoutes" class="nav-item mt-1" :key="route.location">
        <RouterLink
          :to="route.location"
          :title="collapsed ? route.label : null"
          :aria-current="location.path === route.location ? 'page' : null"
          :class="['side-link nav-link d-flex align-items-center', { 'justify-content-center px-0': collapsed, active: location.path === route.location }]"
        >
          <i :class="`bi ${route.icon}`" aria-hidden="true" :style="{ marginRight: collapsed ? 0 : '.75rem' }"></i>
          <span v-show="!collapsed">{{ route.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <div class="px-3">
      <ProfileMenu :collapsed="collapsed" />
    </div>

  </div>

  <!-- bottom tab bar, only below md -->
  <nav class="bottom-nav d-flex d-md-none fixed-bottom bg-white border-top" aria-label="Main menu">
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
.brand-mark {
  width: 34px;
  height: 34px;
  font-size: 18px;
}

.brand-name {
  font-size: 1.5rem;
  letter-spacing: -.5px;
}

.menu-label {
  font-size: .8125rem;
  font-weight: 600;
  letter-spacing: .08em;
}

/* menu rows: dark text, lavender background + purple bar on the left for the current page */
.side-link {
  position: relative;
  padding: .6rem 1.5rem;
  color: var(--bs-body-color);
  font-weight: 500;
  border-radius: 0;
  transition: background-color .15s ease, color .15s ease;
}

.side-link .bi {
  font-size: 1.2rem;
  color: var(--bs-secondary-color);
}

.side-link:hover {
  background-color: var(--bs-secondary-bg);
  color: var(--bs-body-color);
}

.side-link.active {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.side-link.active .bi {
  color: var(--bs-primary);
}

.side-link.active::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background-color: var(--bs-primary);
}

.bottom-nav {
  box-shadow: 0 -4px 16px rgba(28, 26, 61, .05);
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
