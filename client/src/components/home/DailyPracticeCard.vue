<script setup>
import { ref, onMounted } from 'vue'
import serverAPI from '@/services/serverAPI'

const practiceScore = ref(null)

onMounted(async () => {
  try {
    const response = await serverAPI.get('/interview/dashboard')
    practiceScore.value = response.data.averageScore
  } catch (error) {
    console.error(error)
  }
})
</script>

<template>
  <!-- kept to one short row so the Team requests card above has room for a whole request -->
  <div class="card practice-card border-0 px-3 py-2 flex-shrink-0 d-flex flex-row align-items-center gap-3">
    <div class="flex-grow-1 min-w-0">
      <h2 class="h6 fw-semibold mb-0"><i class="bi bi-stars me-1"></i>Daily practice</h2>
      <p class="text-caption mb-0 text-truncate" :title="'Practise interview questions for the internships you are tracking.'">
        <template v-if="practiceScore > 0">Average score {{ practiceScore }}/10</template>
        <template v-else>Questions for the roles you track</template>
      </p>
    </div>
    <RouterLink to="/interview" class="btn btn-sm btn-primary fw-semibold text-nowrap flex-shrink-0">Start practice</RouterLink>
  </div>
</template>
