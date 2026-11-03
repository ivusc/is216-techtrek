<script setup>
// the blue left half of the login and onboarding pages; the page puts its own content in the slot
</script>

<template>
  <!-- only from lg up; on phones the form takes the whole screen -->
  <div class="brand-banner col-lg-6 d-none d-lg-flex flex-column bg-primary text-white position-relative overflow-hidden">
    <!-- decorative circles -->
    <div class="circle circle-teal rounded-circle"></div>
    <div class="circle circle-peach rounded-circle"></div>
    <div class="circle circle-coral rounded-circle"></div>

    <div class="d-flex align-items-center gap-2 position-relative">
      <span class="logo-tile rounded-2 d-flex align-items-center justify-content-center">
        <i class="bi bi-bootstrap-fill text-primary"></i>
      </span>
      <span class="fw-semibold">TechTrek</span>
    </div>

    <div class="banner-content my-auto position-relative">
      <slot></slot>
    </div>

    <p class="banner-footer mb-0 position-relative">IS216 · G10 · Team TechTrek</p>
  </div>
</template>

<style scoped>
.brand-banner {
  padding: 40px 48px;
}

.circle {
  position: absolute;
}
.circle-teal {
  width: 300px;
  height: 300px;
  top: -130px;
  right: -40px;
  background-color: #4fb0b8;
}
.circle-peach {
  width: 240px;
  height: 240px;
  top: 52%;
  right: -100px;
  background-color: #f8dcc0;
}
.circle-coral {
  width: 110px;
  height: 110px;
  top: 47%;
  right: 80px;
  background-color: #e07a6c;
}

.logo-tile {
  width: 32px;
  height: 32px;
  background-color: #fdfcdc;
}

.banner-content {
  max-width: 440px;
}

/* :deep so the page's slot content (title, text) gets these styles too */
.banner-content :deep(.banner-title) {
  font-size: 40px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}
.banner-content :deep(.banner-text) {
  font-size: 14px;
  opacity: 0.85;
}
.banner-content :deep(.feature-icon) {
  width: 36px;
  height: 36px;
  background-color: rgba(255, 255, 255, 0.15);
}
.banner-content :deep(.feature-text) {
  font-size: 12px;
  opacity: 0.8;
}

.banner-footer {
  font-size: 12px;
  opacity: 0.7;
}
</style>
