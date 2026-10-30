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
  background: white;
  border: 1px solid #ded8c3;
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
  font-size: 11px;
  font-weight: 500;
}

.type-tag {
  background: #dff4f4;
  color: #214b54;
}

.difficulty-tag {
  background: #f5f1d9;
  color: #786a38;
}

.question-heading {
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  color: #17394a;
  margin: 0;
}
</style>