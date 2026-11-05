<script setup>
import KanbanCard from './KanbanCard.vue'

const props = defineProps({
  stage: { type: Object, required: true }, // { status, label } from trackerStages
  applications: { type: Array, required: true } // only the applications in this stage
})

// add = + button or "Add", open = a card was clicked, move = (applicationId, newStatus),
// follow-up = (applicationId) the card's "Followed up" button
const emit = defineEmits(['add', 'open', 'move', 'follow-up', 'archive'])

// a card was dragged onto this column: KanbanCard put its id in dataTransfer
function onDrop(event) {
  const applicationId = event.dataTransfer.getData('text/plain')
  emit('move', applicationId, props.stage.status)
}
</script>

<template>
  <section class="kanban-column bg-body-secondary d-flex flex-column" :aria-label="stage.label" @dragover.prevent @drop="onDrop">
    <!-- status dot, name, count, + -->
    <div class="d-flex align-items-center gap-2 px-1 pt-1">
      <span class="status-dot" :style="{ backgroundColor: `var(--tt-status-${stage.status})` }"></span>
      <span class="small fw-semibold">{{ stage.label }}</span>
      <span class="badge rounded-pill bg-white text-body-secondary fw-medium text-caption">{{ applications.length }}</span>
      <button
        class="btn p-0 border-0 ms-auto text-body-tertiary icon-16"
        type="button"
        :aria-label="'Add application to ' + stage.label"
        @click="$emit('add')"
      >
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>

    <KanbanCard
      v-for="application in applications"
      :key="application._id"
      :application="application"
      @open="$emit('open', application)"
      @move="(status) => $emit('move', application._id, status)"
      @follow-up="$emit('follow-up', application._id)"
      @archive="$emit('archive', application._id)"
    />

    <button class="btn btn-sm add-dashed fw-medium text-body-tertiary" type="button" @click="$emit('add')">
      <i class="bi bi-plus-lg me-1"></i> Add
    </button>
  </section>
</template>
