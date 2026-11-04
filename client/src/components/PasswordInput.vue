<script setup>
import { ref } from 'vue'

// a password box with an eye button on the right to show / hide what was typed
// id, placeholder, autocomplete, aria-describedby... are passed straight to the <input>
defineOptions({ inheritAttrs: false })

const password = defineModel({ type: String, default: '' })

defineProps({
  // lockIcon: the small lock on the left, like the login form
  lockIcon: { type: Boolean, default: false },
})

const isVisible = ref(false)
</script>

<template>
  <div class="position-relative">
    <i
      v-if="lockIcon"
      class="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"
      aria-hidden="true"
    ></i>
    <input
      v-bind="$attrs"
      v-model="password"
      :type="isVisible ? 'text' : 'password'"
      class="form-control password-field"
      :class="{ 'ps-5': lockIcon }"
      autocapitalize="off"
      spellcheck="false"
    />
    <button
      type="button"
      class="password-toggle btn border-0 position-absolute top-50 end-0 translate-middle-y text-body-secondary"
      :aria-label="isVisible ? 'Hide password' : 'Show password'"
      :aria-pressed="isVisible"
      :title="isVisible ? 'Hide password' : 'Show password'"
      @click="isVisible = !isVisible"
    >
      <i :class="isVisible ? 'bi bi-eye-slash' : 'bi bi-eye'" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
/* room on the right so typed text never goes under the eye button */
.password-field {
  padding-right: 2.75rem;
}

.password-toggle {
  width: 2.75rem;
  height: 100%;
  padding: 0;
}
.password-toggle:hover,
.password-toggle:focus-visible {
  color: var(--bs-primary) !important;
}
</style>
