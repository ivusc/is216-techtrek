<script setup>
import { ref, computed, watch } from 'vue'
import { formatDate } from '@/utils/date'
import TeamModal from './TeamModal.vue'
import SkillInput from './SkillInput.vue'
import { getKey } from '@/utils/opportunity'

// events: open hackathons from the Devpost list (they have no database _id yet, so they are picked by getKey)
const props = defineProps({
  events: { type: Array, required: true },
  eventsLoading: { type: Boolean, default: false },
  eventsError: { type: Boolean, default: false },
  // the hackathon title to start with, e.g. when "Start a team" is pressed on a hackathon
  initialEvent: { type: String, default: '' },
  team: { type: Object, default: null },
  suggestions: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit', 'remove'])

const MAX_PITCH = 300
const isEditing = props.team !== null

const memberCount = isEditing ? props.team.members.length : 1
const fewestSlots = isEditing && props.team.status !== 'draft' ? 0 : 1

const eventChoice = ref('')
const otherName = ref('')
const otherLocation = ref('')
const otherCloses = ref('')

function eventFields() {
  if (eventChoice.value === 'other') {
    return {
      opportunityId: null,
      eventName: otherName.value,
      eventLocation: otherLocation.value,
      closesAt: otherCloses.value
    }
  }
  return { opportunity: props.events.find((candidate) => getKey(candidate) === eventChoice.value) }
}

let savedEventFields

watch(
  () => props.eventsLoading,
  (loading) => {
    if (loading) return
    if (isEditing) {
      const savedEvent = props.events.find((event) => event.title === props.team.event.name)
      if (savedEvent) {
        eventChoice.value = getKey(savedEvent)
      } else {
        eventChoice.value = 'other'
        otherName.value = props.team.event.name
        otherLocation.value = props.team.event.location ?? ''
        otherCloses.value = props.team.closesAt ? props.team.closesAt.slice(0, 10) : ''
      }
    } else {
      const startEvent = props.initialEvent
        ? props.events.find((event) => event.title === props.initialEvent)
        : props.events[0]
      if (startEvent) {
        eventChoice.value = getKey(startEvent)
      } else {
        eventChoice.value = 'other'
        otherName.value = props.initialEvent
      }
    }
    savedEventFields = eventFields()
  },
  { immediate: true }
)

function changedEventFields() {
  const fields = eventFields()
  const changed = Object.keys(fields).filter((key) => fields[key] !== savedEventFields[key])
  if (changed.length === 0) {
    return {}
  }
  const sent = { opportunityId: null }
  for (const key of changed) {
    sent[key] = fields[key]
  }
  return sent
}

const name = ref(isEditing ? props.team.name : '')
const teamSize = ref(isEditing ? props.team.teamSize : 5)
const openSlots = ref(isEditing ? Math.max(props.team.slotsOpen, fewestSlots) : 1)
const pitch = ref(isEditing ? props.team.pitch : '')
const skills = ref(isEditing ? [...props.team.skills] : [])
const autoAccept = ref(isEditing ? props.team.autoAccept : false)

// one role box per open spot; people asking to join pick one of the filled-in roles
const ROLE_IDEAS = ['Frontend developer', 'Backend developer', 'Full-stack developer', 'UI/UX designer', 'Data / ML', 'Pitch & business']
const MAX_ROLE = 60
// every role typed so far is kept, even past the number of open slots, so lowering the slots doesn't
// quietly throw roles away: the extra ones are listed with a warning and can be kept instead
const roles = ref(isEditing ? [...(props.team.openRoles ?? [])] : [])
function fitRoles() {
  // filled roles first (in order), then empty boxes up to the number of open slots
  const filled = roles.value.filter((role) => role.trim() !== '')
  const empties = Math.max(openSlots.value - filled.length, 0)
  roles.value = [...filled, ...Array(empties).fill('')]
}
fitRoles()
watch(openSlots, fitRoles)

// the boxes on screen: one per open slot
const shownRoles = computed(() => roles.value.slice(0, openSlots.value))
// roles past the open slots: they'd be removed on save
const droppedRoles = computed(() =>
  roles.value
    .map((role, index) => ({ role: role.trim(), index }))
    .filter((entry) => entry.index >= openSlots.value && entry.role !== '')
)
const filledRoles = computed(() => shownRoles.value.map((role) => role.trim()).filter((role) => role !== ''))

// keep a role that would be dropped: it takes the last box, and the role there drops instead
function keepRole(entry) {
  const last = openSlots.value - 1
  if (last < 0) return
  const swapped = roles.value[last]
  roles.value[last] = roles.value[entry.index]
  roles.value[entry.index] = swapped
}
const canAddSlot = computed(() => openSlots.value < teamSize.value - memberCount)

// an idea chip fills the first empty box (or clears that role if it's already in)
function toggleRoleIdea(idea) {
  const index = shownRoles.value.findIndex((role) => role.trim().toLowerCase() === idea.toLowerCase())
  if (index !== -1) {
    roles.value[index] = ''
    return
  }
  const empty = shownRoles.value.findIndex((role) => role.trim() === '')
  if (empty !== -1) roles.value[empty] = idea
}
function hasRole(idea) {
  return shownRoles.value.some((role) => role.trim().toLowerCase() === idea.toLowerCase())
}
const rolesFull = computed(() => shownRoles.value.every((role) => role.trim() !== ''))
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
  for (let slots = fewestSlots; slots <= teamSize.value - memberCount; slots++) {
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
    openRoles: filledRoles.value,
    autoAccept: autoAccept.value,
    status: status
  }

  Object.assign(post, isEditing ? changedEventFields() : eventFields())

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
      <select id="post-event" v-model="eventChoice" class="form-select" :disabled="eventsLoading">
        <option v-if="eventsLoading" value="">Loading hackathons…</option>
        <template v-else>
          <option v-for="event in events" :key="getKey(event)" :value="getKey(event)">
            {{ event.title }}<template v-if="event.deadline"> · closes {{ formatDate(event.deadline) }}</template>
          </option>
          <option value="other">Other event (not on the list)</option>
        </template>
      </select>
      <p v-if="eventsError" class="text-caption text-tt-accent mt-1 mb-0">
        Couldn't load Devpost hackathons. Pick Other and type the event's name.
      </p>

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

    <fieldset v-if="openSlots > 0" class="mb-3">
      <legend class="small fw-semibold mb-1">Roles for your open spots <span class="fw-normal text-body-tertiary">(optional)</span></legend>
      <p class="text-caption text-body-tertiary mb-2">
        People asking to join pick one of these roles. Leave them blank to take anyone.
      </p>
      <div class="row g-2 mb-2">
        <div v-for="(role, index) in shownRoles" :key="index" class="col-12 col-sm-6">
          <div class="position-relative">
            <span class="role-number position-absolute top-50 start-0 translate-middle-y ms-2 rounded-circle d-flex align-items-center justify-content-center" aria-hidden="true">{{ index + 1 }}</span>
            <input
              v-model="roles[index]"
              type="text"
              class="form-control ps-5"
              :maxlength="MAX_ROLE"
              :placeholder="index === 0 ? 'e.g. Frontend developer' : 'e.g. Designer'"
              :aria-label="'Role for open spot ' + (index + 1)"
            >
          </div>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-1">
        <button
          v-for="idea in ROLE_IDEAS"
          :key="idea"
          type="button"
          class="btn btn-sm rounded-pill"
          :class="hasRole(idea) ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
          :disabled="!hasRole(idea) && rolesFull"
          :aria-pressed="hasRole(idea)"
          @click="toggleRoleIdea(idea)"
        >
          <i class="bi" :class="hasRole(idea) ? 'bi-check-lg' : 'bi-plus'" aria-hidden="true"></i> {{ idea }}
        </button>
      </div>
    </fieldset>

    <!-- fewer open slots than roles: say which roles go, and let the lead keep one instead -->
    <div v-if="droppedRoles.length > 0" class="dropped-roles rounded-3 p-3 mb-3" role="alert">
      <p class="small fw-semibold mb-1">
        <i class="bi bi-exclamation-triangle-fill me-1" aria-hidden="true"></i>
        {{ droppedRoles.length === 1 ? 'This role will be removed' : 'These roles will be removed' }} when you save
      </p>
      <p class="text-caption mb-2">
        You now have {{ openSlots === 1 ? '1 open slot' : openSlots + ' open slots' }}, so there's only room for {{ openSlots === 1 ? '1 role' : openSlots + ' roles' }}.
        <template v-if="openSlots > 0">Tap Keep to swap one in for the last role above.</template>
      </p>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span v-for="entry in droppedRoles" :key="entry.index" class="dropped-role d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-1 py-1 small">
          <span class="text-decoration-line-through">{{ entry.role }}</span>
          <button v-if="openSlots > 0" type="button" class="btn btn-sm btn-light rounded-pill py-0 px-2 fw-semibold" @click="keepRole(entry)">Keep</button>
        </span>
        <button v-if="canAddSlot" type="button" class="btn btn-sm btn-link fw-semibold text-decoration-none p-0" @click="openSlots++">
          <i class="bi bi-plus" aria-hidden="true"></i> Add an open slot instead
        </button>
      </div>
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
      <button v-else class="btn btn-sm btn-link fw-semibold text-decoration-none me-auto" :disabled="busy || eventsLoading" @click="submit('draft')">Save draft</button>

      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" @click="$emit('close')">Cancel</button>
      <button class="btn btn-sm btn-tt-accent fw-semibold px-3" :disabled="busy || eventsLoading" @click="submit('open')">
        {{ busy ? 'Saving...' : publishLabel }}
      </button>
    </template>
  </TeamModal>
</template>

<style scoped>
.dropped-roles {
  color: var(--bs-warning-text-emphasis);
  background-color: var(--bs-warning-bg-subtle);
  border: 1px solid var(--bs-warning-border-subtle);
}
.dropped-role {
  background-color: var(--tt-surface);
  border: 1px solid var(--bs-warning-border-subtle);
  color: var(--bs-body-color);
}

.role-number {
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 600;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
</style>
