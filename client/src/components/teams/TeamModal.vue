<script setup>
import { onMounted, onUnmounted } from 'vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  width: { type: String, default: '520px' }
})

const emit = defineEmits(['close'])

function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>

  <div class="modal-backdrop fade show team-backdrop"></div>

  <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" :aria-label="title" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :style="{ maxWidth: width }">
      <div class="modal-content overflow-hidden">
        <div class="modal-header align-items-start">
          <div>
            <h2 class="h3 mb-1">{{ title }}</h2>
            <p v-if="subtitle !== ''" class="small text-body-tertiary mb-0">{{ subtitle }}</p>
          </div>
          <button class="btn-close" title="Close" aria-label="Close" @click="$emit('close')"></button>
        </div>

        <div class="modal-body">
          <slot />
        </div>

        <div class="modal-footer bg-body-secondary border-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>
