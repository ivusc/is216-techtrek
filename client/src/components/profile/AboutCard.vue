<script setup>
const about = defineModel({ type: String, default: '' });

defineProps({
  editing: { type: Boolean, default: false },
});
</script>

<template>
  <div class="card profile-card p-4 d-flex flex-column gap-2">
    <h3 class="mb-1">About</h3>
    <template v-if="editing">
      <label for="profile-about" class="visually-hidden">About you</label>
      <textarea
        id="profile-about"
        v-model="about"
        class="form-control"
        rows="4"
        maxlength="500"
        placeholder="What you study, what you like building and what you are looking for."
      ></textarea>
      <p class="text-caption text-body-tertiary text-end mb-0">{{ about.length }} / 500</p>
    </template>
    <p v-else-if="about" class="profile-about text-body-secondary mb-0">{{ about }}</p>
    <p v-else class="text-body-tertiary mb-0">
      Add a short intro so team leaders know what you are into.
    </p>
  </div>
</template>
