<script setup>
import SideBar from './components/SideBar.vue';

</script>

<template>
  <div class="d-flex">
    <SideBar />
    <main class="flex-grow-1 p-4">
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
