<script setup>
import { ref } from 'vue'

// "Copy link": works out the link (getLink may need the server, e.g. to save a shared listing first),
// copies it, and says "Link copied" for a few seconds. If the browser won't allow copying, the link is
// shown in a box instead so it can be copied by hand.
const props = defineProps({
  getLink: { type: Function, required: true }, // () => link, or a Promise of one
  label: { type: String, default: 'Copy link' },
  compact: { type: Boolean, default: false } // icon only (the label becomes its tooltip)
})

const state = ref('idle') // idle | busy | copied | failed
const fallbackLink = ref('')
let resetTimer = null

async function copy() {
  if (state.value === 'busy') return
  state.value = 'busy'
  fallbackLink.value = ''
  let link = ''
  try {
    link = await props.getLink()
    await navigator.clipboard.writeText(link)
    state.value = 'copied'
  } catch (error) {
    console.error(error)
    if (link) fallbackLink.value = link
    state.value = 'failed'
  }
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    if (state.value === 'copied') state.value = 'idle'
  }, 2500)
}

const text = () => (state.value === 'copied' ? 'Link copied' : state.value === 'busy' ? 'Copying…' : props.label)
</script>

<template>
  <span class="copy-link d-inline-flex flex-column gap-1">
    <button
      type="button"
      class="btn fw-semibold"
      :class="compact ? 'bg-white details-icon-btn' : 'btn-outline-primary'"
      :disabled="state === 'busy'"
      :title="compact ? text() : undefined"
      :aria-label="compact ? text() : undefined"
      @click="copy"
    >
      <i class="bi" :class="state === 'copied' ? 'bi-check2' : 'bi-link-45deg'" aria-hidden="true"></i>
      <template v-if="!compact"> {{ text() }}</template>
    </button>
    <span v-if="state === 'copied'" class="visually-hidden" role="status">Link copied</span>
    <!-- copying was blocked: show the link to copy by hand -->
    <input v-if="fallbackLink" class="form-control form-control-sm" :value="fallbackLink" readonly aria-label="Link to share" @focus="$event.target.select()" />
    <span v-else-if="state === 'failed'" class="text-caption text-danger" role="alert">Couldn't make a link. Try again.</span>
  </span>
</template>
