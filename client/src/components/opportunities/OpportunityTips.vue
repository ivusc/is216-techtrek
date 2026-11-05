<script setup>
import { onMounted, ref } from 'vue'
import { fetchTipsForOpportunity } from '@/services/opportunityService'
import { reviewDifficulties } from '@/constants'

// "Senior tips" in an opportunity's details panel: what SMU students who got an offer at this company
// said about the interviews (shared anonymously from their Tracker). Same role first.
const props = defineProps({
  organisation: { type: String, required: true },
  title: { type: String, default: '' }
})

const tips = ref([])
const isLoading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    tips.value = await fetchTipsForOpportunity(props.organisation, props.title)
  } catch (error) {
    console.error(error)
    failed.value = true
  }
  isLoading.value = false
})

function difficultyLabel(value) {
  return reviewDifficulties.find((option) => option.value === value)?.label ?? ''
}

function sharedIn(date) {
  return new Date(date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="d-flex flex-column gap-2" aria-labelledby="opportunity-tips-title">
    <h2 id="opportunity-tips-title" class="h4 mb-0">Senior tips</h2>

    <p v-if="isLoading" class="small text-body-secondary mb-0">Looking for tips from seniors…</p>
    <p v-else-if="failed" class="small text-body-secondary mb-0">Couldn't load tips right now.</p>
    <p v-else-if="tips.length === 0" class="small text-body-secondary mb-0">
      No tips for {{ organisation }} yet. When an SMU student gets an offer here, their interview tips show up.
    </p>

    <ul v-else class="list-unstyled d-flex flex-column gap-2 mb-0">
      <li v-for="(tip, index) in tips" :key="index" class="tip card p-3 d-flex flex-column gap-1">
        <div class="d-flex flex-wrap align-items-center column-gap-2 row-gap-1">
          <span class="small fw-semibold">{{ tip.title }}</span>
          <span v-if="tip.sameRole" class="badge rounded-pill bg-primary-subtle text-primary-emphasis fw-medium">This role</span>
          <span class="badge rounded-pill bg-body-secondary text-body-secondary fw-medium ms-auto">
            Difficulty {{ tip.difficulty }}/5 · {{ difficultyLabel(tip.difficulty) }}
          </span>
        </div>
        <p v-if="tip.rounds" class="small text-body-secondary mb-0">Rounds: {{ tip.rounds }}</p>
        <p class="mb-0 text-break">{{ tip.tips }}</p>
        <span class="text-caption text-body-tertiary">An SMU senior · {{ sharedIn(tip.createdAt) }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tip {
  background-color: var(--tt-surface);
}
</style>
