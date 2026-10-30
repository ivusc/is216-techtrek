<script setup>
import SideBar from './components/SideBar.vue';

</script>

<template>
  <div class="d-flex">
    <SideBar />
    <!-- min-width 0 lets wide content (the tracker board) scroll inside main instead of widening the page -->
    <main class="flex-grow-1 p-4" style="min-width: 0">
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
