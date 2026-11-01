<script setup>
import { ref, computed, watch } from 'vue'
import { formatDate } from '@/utils/date'
import TeamModal from './TeamModal.vue'
import SkillInput from './SkillInput.vue'

const props = defineProps({
  events: { type: Array, required: true },
  team: { type: Object, default: null },
  suggestions: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit', 'remove'])

const MAX_PITCH = 300
const isEditing = props.team !== null

const memberCount = isEditing ? props.team.members.length : 1

const eventChoice = ref('')
const otherName = ref('')
const otherLocation = ref('')
const otherCloses = ref('')

if (isEditing) {
  const savedEvent = props.events.find((event) => event._id === props.team.event.opportunityId)
  if (savedEvent) {
    eventChoice.value = savedEvent._id
  } else {
    eventChoice.value = 'other'
    otherName.value = props.team.event.name
    otherLocation.value = props.team.event.location ?? ''
    otherCloses.value = props.team.closesAt ? props.team.closesAt.slice(0, 10) : ''
  }
} else {
  eventChoice.value = props.events.length > 0 ? props.events[0]._id : 'other'
}

const name = ref(isEditing ? props.team.name : '')
const teamSize = ref(isEditing ? props.team.teamSize : 5)
const openSlots = ref(isEditing ? props.team.slotsOpen : 1)
const pitch = ref(isEditing ? props.team.pitch : '')
const skills = ref(isEditing ? [...props.team.skills] : [])
const autoAccept = ref(isEditing ? props.team.autoAccept : false)
const formError = ref('')

const teamSizeOptions = computed(() => {
  const options = []
  for (let size = Math.max(2, memberCount); size <= 10; size++) {
    options.push(size)
  }
  return options
})

const openSlotOptions = computed(() => {
  const options = []
  for (let slots = isEditing ? 0 : 1; slots <= teamSize.value - memberCount; slots++) {
    options.push(slots)
  }
  return options
})

watch(teamSize, () => {
  const most = teamSize.value - memberCount
  if (openSlots.value > most) {
    openSlots.value = most
  }
})

function submit(status) {
  formError.value = ''
  if (name.value.trim() === '') {
    formError.value = 'Give your team a name.'
    return
  }
  if (pitch.value.trim() === '') {
    formError.value = 'Write a short pitch for your team.'
    return
  }
  if (eventChoice.value === 'other' && otherName.value.trim() === '') {
    formError.value = 'Type in the name of the hackathon or competition.'
    return
  }

  const post = {
    name: name.value,
    teamSize: teamSize.value,
    openSlots: openSlots.value,
    pitch: pitch.value,
    skills: skills.value,
    autoAccept: autoAccept.value,
    status: status
  }

  if (eventChoice.value === 'other') {
    post.opportunityId = null
    post.eventName = otherName.value
    post.eventLocation = otherLocation.value
    post.closesAt = otherCloses.value
  } else {
    post.opportunityId = eventChoice.value
  }

  emit('submit', post)
}

const publishLabel = isEditing && props.team.status !== 'draft' ? 'Save changes' : 'Publish post'
const showDelete = isEditing && props.team.status !== 'draft'
</script>

<template>
  <TeamModal
    :title="isEditing ? 'Edit team post' : 'Create a team post'"
    subtitle="Advertise your open slots. Posts close automatically when your team is full."
    width="600px"
    @close="$emit('close')"
  >

    <div class="mb-3">
      <label class="small fw-semibold mb-1" for="post-event">Hackathon or competition</label>
      <select id="post-event" v-model="eventChoice" class="form-select">
        <option v-for="event in events" :key="event._id" :value="event._id">
          {{ event.title }}<template v-if="event.deadline"> · closes {{ formatDate(event.deadline) }}</template>
        </option>
        <option value="other">Other event (type it in)</option>
      </select>

      <div v-if="eventChoice === 'other'" class="row g-2 mt-1">
        <div class="col-12 col-sm-5">
          <input v-model="otherName" type="text" class="form-control" placeholder="Event name" aria-label="Event name" maxlength="200">
        </div>
        <div class="col-6 col-sm-4">
          <input v-model="otherLocation" type="text" class="form-control" placeholder="Location" aria-label="Event location" maxlength="200">
        </div>
        <div class="col-6 col-sm-3">
          <input v-model="otherCloses" type="date" class="form-control" aria-label="Closing date">
        </div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-sm-5">
        <label class="small fw-semibold mb-1" for="post-name">Team name</label>
        <input id="post-name" v-model="name" type="text" class="form-control" maxlength="100">
      </div>
      <div class="col-6 col-sm-4">
        <label class="small fw-semibold mb-1" for="post-size">Team size</label>
        <select id="post-size" v-model.number="teamSize" class="form-select">
          <option v-for="size in teamSizeOptions" :key="size" :value="size">{{ size }} members</option>
        </select>
      </div>
      <div class="col-6 col-sm-3">
        <label class="small fw-semibold mb-1" for="post-slots">Open slots</label>
        <select id="post-slots" v-model.number="openSlots" class="form-select">
          <option v-for="slots in openSlotOptions" :key="slots" :value="slots">{{ slots }}</option>
        </select>
      </div>
    </div>

    <div class="mb-3">
      <label class="small fw-semibold mb-1" for="post-pitch">Pitch</label>
      <textarea id="post-pitch" v-model="pitch" class="form-control" rows="3" :maxlength="MAX_PITCH"></textarea>
      <p class="text-caption text-body-tertiary text-end mb-0 mt-1">{{ pitch.length }} / {{ MAX_PITCH }}</p>
    </div>

    <div class="mb-3">
      <label class="small fw-semibold mb-1">Skills you're looking for</label>
      <SkillInput v-model="skills" :suggestions="suggestions" />
    </div>

    <div class="d-flex justify-content-between align-items-center gap-3 bg-body-secondary rounded-3 p-3">
      <div>
        <p class="small fw-semibold mb-0">Accept requests automatically from matched skills</p>
        <p class="text-caption text-body-tertiary mb-0">
          {{ autoAccept ? 'On: people with a matching skill join straight away.' : 'Off: you review every request in your Requests inbox.' }}
        </p>
      </div>
      <div class="form-check form-switch m-0">
        <input v-model="autoAccept" class="form-check-input" type="checkbox" role="switch" aria-label="Accept requests automatically">
      </div>
    </div>

    <p v-if="formError !== '' || error !== ''" class="small text-tt-accent mt-3 mb-0">{{ formError || error }}</p>

    <template #footer>
      <button
        v-if="showDelete"
        class="btn btn-sm btn-link text-tt-accent fw-semibold text-decoration-none me-auto"
        :disabled="busy"
        @click="$emit('remove')"
      >
        Delete post
      </button>
      <button v-else class="btn btn-sm btn-link fw-semibold text-decoration-none me-auto" :disabled="busy" @click="submit('draft')">Save draft</button>

      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" @click="$emit('close')">Cancel</button>
      <button class="btn btn-sm btn-tt-accent fw-semibold px-3" :disabled="busy" @click="submit('open')">
        {{ busy ? 'Saving...' : publishLabel }}
      </button>
    </template>
  </TeamModal>
</template>
