<script setup>
// the blue left half of the login and onboarding pages; the page puts its own content in the slot
</script>

<template>
  <!-- only from md up; on phones the form takes the whole screen -->
  <div
    class="brand-banner col-md-6 d-none d-md-flex flex-column align-items-start bg-primary text-white position-relative overflow-hidden"
  >
    <span class="circle circle-teal d-none d-lg-block" aria-hidden="true"></span>
    <span class="circle circle-peach d-none d-xl-block" aria-hidden="true"></span>
    <span class="circle circle-coral d-none d-xl-block" aria-hidden="true"></span>

    <div class="d-flex align-items-center gap-2 position-relative">
      <span class="logo-tile">
        <img src="@/assets/logo.svg" alt="" width="22" height="22" />
      </span>
      <span class="h3 mb-0 text-white">TechTrek</span>
    </div>

    <div class="banner-content position-relative my-auto py-5">
      <slot></slot>
    </div>

  </div>
</template>

<style scoped>
.brand-banner {
  padding: 1.5rem;
}

.circle {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
}

.circle-teal {
  width: 61.76%;
  top: 0;
  right: -17.65%;
  transform: translateY(-33.33%);
  background-color: var(--bs-info);
}

.circle-peach {
  width: 32.35%;
  top: 54.69%;
  right: -8.82%;
  background-color: var(--tt-peach);
}

.circle-coral {
  width: 17.65%;
  top: 48.83%;
  left: 69.12%;
  background-color: var(--tt-accent);
}

.logo-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--bs-border-radius);
  background-color: rgba(255, 255, 255, 0.95); /* banner is purple in both themes, so no theme colour */
}

/* :deep so the page's slot content (title, text) gets these styles too */
.banner-content :deep(.banner-title) {
  max-width: 500px;
}

.banner-content :deep(.banner-text) {
  max-width: 460px;
  color: rgba(255, 255, 255, 0.95);
}

.banner-content :deep(.feature-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 1.25rem;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.14);
}

.banner-content :deep(.feature-text) {
  color: rgba(255, 255, 255, 0.9);
}

@media (min-width: 992px) {
  .brand-banner {
    padding: 3rem;
  }
}

@media (min-width: 1400px) {
  .brand-banner {
    width: 47.22%;
    padding: 4rem;
  }
}
</style>
