<script setup>
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

// the bar along the top of the landing page. It sticks to the top as you scroll (position: sticky),
// gets a shadow once the page has moved, and underlines the section you are looking at.
defineProps({
  loggedIn: { type: Boolean, default: false },
  scrolled: { type: Boolean, default: false }, // the page has scrolled away from the very top
  active: { type: String, default: '' } // id of the section on screen
})

const emit = defineEmits(['go'])

const links = [
  { id: 'problem', label: 'The problem' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' }
]

// phones: the links fold into a menu
const menuOpen = ref(false)

function go(id) {
  menuOpen.value = false
  emit('go', id)
}
</script>

<template>
  <header class="landing-nav" :class="{ 'is-scrolled': scrolled }">
    <div class="landing-container d-flex align-items-center gap-3">
      <button type="button" class="brand d-flex align-items-center gap-2 border-0 bg-transparent p-0" @click="go('top')">
        <img src="/favicon.svg" alt="" width="36" height="36" class="flex-shrink-0" />
        <span class="h3 mb-0">TechTrek</span>
      </button>

      <nav class="d-none d-lg-flex align-items-center gap-1 ms-4" aria-label="Page sections">
        <button
          v-for="link in links"
          :key="link.id"
          type="button"
          class="nav-link-btn"
          :class="{ 'is-active': active === link.id }"
          :aria-current="active === link.id ? 'true' : undefined"
          @click="go(link.id)"
        >
          {{ link.label }}
        </button>
      </nav>

      <div class="d-flex align-items-center gap-2 ms-auto">
        <ThemeToggle />
        <template v-if="loggedIn">
          <RouterLink to="/home" class="btn btn-primary fw-semibold">
            Open TechTrek <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-outline-primary fw-semibold d-none d-sm-inline-block">Log in</RouterLink>
          <RouterLink :to="{ path: '/login', query: { mode: 'signup' } }" class="btn btn-primary fw-semibold">Sign up</RouterLink>
        </template>

        <button
          type="button"
          class="menu-btn btn btn-light d-lg-none"
          :aria-expanded="menuOpen"
          aria-controls="landing-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- phones and tablets: the section links drop down under the bar -->
    <nav id="landing-menu" class="mobile-menu d-lg-none" :class="{ 'is-open': menuOpen }" aria-label="Page sections">
      <div class="landing-container d-flex flex-column py-2">
        <button
          v-for="link in links"
          :key="link.id"
          type="button"
          class="mobile-link text-start"
          :class="{ 'is-active': active === link.id }"
          :tabindex="menuOpen ? 0 : -1"
          @click="go(link.id)"
        >
          {{ link.label }}
        </button>
        <RouterLink v-if="!loggedIn" to="/login" class="mobile-link d-sm-none" :tabindex="menuOpen ? 0 : -1">Log in</RouterLink>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  /* see-through page colour (set in landing.css, with a dark-mode version) */
  background-color: var(--landing-nav-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid transparent;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.landing-nav.is-scrolled {
  border-bottom-color: var(--bs-border-color);
  box-shadow: 0 6px 18px -12px rgba(28, 26, 61, 0.35);
}
.landing-nav > .landing-container {
  min-height: 68px;
}

.brand {
  color: var(--bs-heading-color);
}
/* the section links: a bar slides in under the one you are on */
.nav-link-btn {
  position: relative;
  padding: 8px 14px;
  border: 0;
  border-radius: var(--bs-border-radius);
  background: transparent;
  color: var(--bs-secondary-color);
  font-weight: 600;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.nav-link-btn::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background-color: var(--bs-primary);
  transform: scaleX(0);
  transition: transform 0.25s ease;
}
.nav-link-btn:hover {
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
.nav-link-btn.is-active {
  color: var(--bs-primary);
}
.nav-link-btn.is-active::after {
  transform: scaleX(1);
}

.menu-btn {
  width: 40px;
  height: 40px;
  padding: 0;
}

/* the phone menu opens by growing its height (max-height has a transition) */
.mobile-menu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.mobile-menu.is-open {
  max-height: 320px;
  border-top: 1px solid var(--bs-border-color);
}
.mobile-link {
  display: block;
  padding: 12px 4px;
  border: 0;
  background: transparent;
  color: var(--bs-body-color);
  font-weight: 600;
  text-decoration: none;
}
.mobile-link.is-active {
  color: var(--bs-primary);
}

@media (prefers-reduced-motion: reduce) {
  .nav-link-btn::after,
  .mobile-menu {
    transition: none;
  }
}
</style>
