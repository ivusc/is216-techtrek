<script setup>
import { reviewDifficulties } from '@/constants';

defineProps({
  tips: { type: Array, required: true },
  filtered: { type: Boolean, default: false },
});

function difficultyLabel(value) {
  return reviewDifficulties.find((option) => option.value === value).label;
}

function sharedIn(date) {
  return new Date(date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
}
</script>

<template>
  <section aria-labelledby="senior-tips-title">
    <h2 id="senior-tips-title" class="visually-hidden">Senior tips</h2>
    <p class="small text-body-secondary mb-3">
      From SMU students who got an offer for a role you applied to · posted anonymously
    </p>
    <div class="card interview-card">
      <p v-if="tips.length === 0 && filtered" class="text-body-secondary mb-0 p-4">
        No tips match these filters.
      </p>
      <p v-else-if="tips.length === 0" class="text-body-secondary mb-0 p-4">
        No tips yet for the roles you're preparing for. When a senior gets an offer for one of them,
        their tips show up here.
      </p>
      <ul v-else class="list-group list-group-flush">
        <li
          v-for="(tip, index) in tips"
          :key="index"
          class="list-group-item bg-transparent d-flex flex-column gap-2 px-3 px-md-4 py-3"
        >
          <div
            class="d-flex flex-column flex-md-row align-items-start align-items-md-center column-gap-3 row-gap-1"
          >
            <h3 class="h6 fw-semibold mb-0">{{ tip.organisation }} · {{ tip.title }}</h3>
            <span class="badge rounded-pill bg-info-subtle text-primary fw-medium ms-md-auto">
              Difficulty {{ tip.difficulty }}/5 · {{ difficultyLabel(tip.difficulty) }}
            </span>
          </div>
          <p v-if="tip.rounds" class="small text-body-secondary mb-0">Rounds: {{ tip.rounds }}</p>
          <p class="mb-0 text-break">{{ tip.tips }}</p>
          <span class="text-caption text-body-tertiary">
            An SMU senior · {{ sharedIn(tip.createdAt) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
