<script setup>
defineProps({
  busy: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

defineEmits(['save', 'discard']);
</script>

<template>
  <div
    class="save-bar d-flex flex-wrap align-items-center justify-content-end gap-2"
    role="region"
    aria-label="Unsaved profile changes"
  >
    <p v-if="error" class="small text-tt-accent mb-0 me-auto" role="alert">{{ error }}</p>
    <button
      type="button"
      class="btn btn-outline-primary fw-semibold"
      :disabled="busy"
      @click="$emit('discard')"
    >
      Discard
    </button>
    <button
      type="button"
      class="btn btn-primary fw-semibold"
      :disabled="busy || !canSave"
      @click="$emit('save')"
    >
      {{ busy ? 'Saving…' : 'Save changes' }}
    </button>
  </div>
</template>
