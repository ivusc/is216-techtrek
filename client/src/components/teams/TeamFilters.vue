<script setup>

defineProps({
  eventOptions: { type: Array, required: true },
  skillOptions: { type: Array, required: true },
  count: { type: Number, required: true },
  anyFilter: { type: Boolean, default: false }
})

const event = defineModel('event', { type: String, required: true })
const skills = defineModel('skills', { type: Array, required: true })
const size = defineModel('size', { type: String, required: true })
const openOnly = defineModel('openOnly', { type: Boolean, required: true })
// on: only teams that want one of my skills, with my matching skills highlighted
const matchMySkills = defineModel('matchMySkills', { type: Boolean, default: false })

defineEmits(['clear'])
</script>

<template>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <button
      type="button"
      class="btn btn-sm rounded-pill fw-semibold"
      :class="matchMySkills ? 'btn-primary' : 'bg-white border text-primary'"
      :aria-pressed="matchMySkills"
      @click="matchMySkills = !matchMySkills"
    >
      <i :class="matchMySkills ? 'bi bi-check-lg' : 'bi bi-stars'" aria-hidden="true"></i>
      Match my skills
    </button>

    <select
      v-model="event"
      class="form-select form-select-sm rounded-pill w-auto event-select"
      :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': event !== '' }"
      aria-label="Filter by event"
    >
      <option value="">Event: All</option>
      <option v-for="name in eventOptions" :key="name" :value="name">{{ name }}</option>
    </select>

    <div class="dropdown">
      <button
        class="btn btn-sm rounded-pill dropdown-toggle skills-button"
        :class="skills.length > 0 ? 'bg-primary-subtle border-primary text-primary-emphasis' : 'bg-white border'"
        type="button"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
      >
        <span class="text-truncate d-inline-block align-bottom skills-label">Skills: {{ skills.length > 0 ? skills.join(', ') : 'Any' }}</span>
      </button>
      <div class="dropdown-menu p-2 skills-menu">
        <p v-if="skillOptions.length === 0" class="small text-body-tertiary px-2 mb-0">No skills yet</p>
        <div v-for="skill in skillOptions" :key="skill" class="form-check px-4 py-1">
          <input :id="'skill-' + skill" v-model="skills" class="form-check-input" type="checkbox" :value="skill">
          <label class="form-check-label small" :for="'skill-' + skill">{{ skill }}</label>
        </div>
        <button v-if="skills.length > 0" class="btn btn-link btn-sm fw-semibold text-decoration-none" @click="skills = []">Clear skills</button>
      </div>
    </div>

    <select
      v-model="size"
      class="form-select form-select-sm rounded-pill w-auto"
      :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': size !== '' }"
      aria-label="Filter by team size"
    >
      <option value="">Team size</option>
      <option value="small">2–3 members</option>
      <option value="medium">4–5 members</option>
      <option value="large">6+ members</option>
    </select>

    <button
      class="btn btn-sm rounded-pill"
      :class="openOnly ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
      @click="openOnly = !openOnly"
    >
      Open slots only
    </button>

    <button v-if="anyFilter" class="btn btn-sm btn-link fw-semibold text-decoration-none" @click="$emit('clear')">Clear</button>

    <span class="ms-sm-auto small text-body-tertiary">{{ count }} {{ count === 1 ? 'team' : 'teams' }} {{ openOnly ? 'recruiting' : 'found' }}</span>
  </div>
</template>
