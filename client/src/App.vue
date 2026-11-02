<script setup>
import SideBar from './components/SideBar.vue';

</script>

<template>
  <div class="d-flex">
    <SideBar />
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
