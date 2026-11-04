<script setup>
defineProps({
  question: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="question-card">
    <div class="question-header">
      <div class="question-tags">
        <span class="tag type-tag">
          {{ question.type }}
        </span>

        <span class="tag difficulty-tag">
          {{ question.difficulty }}
        </span>
      </div>

      <h2 class="question-heading">
        {{ question.question }}
      </h2>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  background: var(--tt-surface);
  border: 1px solid var(--bs-border-color);
  border-radius: 14px;
  padding: 24px;
}

.question-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.question-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
}

.type-tag {
  background: var(--bs-info-bg-subtle);
  color: var(--bs-info-text-emphasis);
}

.difficulty-tag {
  background: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.question-heading {
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0;
}
</style>