<script setup>
import { ref } from 'vue'

// light/dark switch. index.html sets data-bs-theme before first paint; this flips it and remembers the choice
const theme = ref(document.documentElement.dataset.bsTheme === 'dark' ? 'dark' : 'light')
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.bsTheme = theme.value
  try { localStorage.setItem('theme', theme.value) } catch { /* private mode: theme just won't persist */ }
}
</script>

<template>
  <button
    type="button"
    class="btn bg-white border rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 theme-toggle"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
    @click="toggleTheme"
  >
    <i :class="theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon'" aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
}
</style>
