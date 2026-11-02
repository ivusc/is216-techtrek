<script setup>
import SideBar from './components/SideBar.vue';
import {useUserStore} from '@/store/user'
const userStore = useUserStore()
</script>

<template>
  <div class="d-flex vh-100">
    <SideBar v-if="userStore.isLoggedIn"/>
    <!-- min-width 0 lets wide content (the tracker board) scroll inside main instead of widening the page -->
    <main class="flex-grow-1 p-4" style="min-width: 0">
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
