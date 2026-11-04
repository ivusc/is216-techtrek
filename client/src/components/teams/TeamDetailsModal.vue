<script setup>
import { computed, ref } from 'vue'
import TeamModal from './TeamModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/date'
import { safeHttpUrl } from '@/utils/url'
import { getDisplayName, getSchoolLine, getEventBadgeClass, sameSkill } from '@/utils/team'

// everything about one team: who is already in it (with their role and profile), how many more
// people it needs, and what skills it is looking for
const props = defineProps({
  team: { type: Object, required: true },
  canRequest: { type: Boolean, default: false } // show "Request to join"
})

defineEmits(['close', 'request'])

const leaderId = computed(() => String(props.team.leader?._id ?? props.team.leader ?? ''))

// the lead first, then everyone else in the order they joined
const members = computed(() => {
  const list = props.team.members.map((member) => ({
    ...member,
    isLead: String(member.user._id) === leaderId.value
  }))
  return [...list.filter((member) => member.isLead), ...list.filter((member) => !member.isLead)]
})

const filled = computed(() => props.team.teamSize - props.team.slotsOpen)
const openSpots = computed(() => Array.from({ length: props.team.slotsOpen }, (_, index) => index))
const externalSpots = computed(() => Array.from({ length: props.team.externalMembers ?? 0 }, (_, index) => index))

const neededText = computed(() => {
  if (props.team.slotsOpen === 0) return 'Team is full'
  return props.team.slotsOpen === 1 ? '1 more person needed' : props.team.slotsOpen + ' more people needed'
})

// one member's profile opens under the circles when you click them
const openMemberId = ref(null)
const openMember = computed(() => members.value.find((member) => member.user._id === openMemberId.value) ?? null)
function toggleMember(member) {
  openMemberId.value = openMemberId.value === member.user._id ? null : member.user._id
}

function roleOf(member) {
  if (member.isLead) return 'Team lead'
  return member.role || 'Member'
}

// wanted skills I have (from my profile) get a tick
const auth = useUserStore()
function isMine(skill) {
  return auth.skills.some((mine) => sameSkill(mine, skill))
}
</script>

<template>
  <TeamModal :title="team.name" :subtitle="'Led by ' + getDisplayName(team.leader)" width="640px" @close="$emit('close')">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <span class="badge rounded-pill fw-medium" :class="getEventBadgeClass(team.event.name)">{{ team.event.name }}</span>
      <span v-if="team.event.location" class="text-caption text-body-secondary"><i class="bi bi-geo-alt me-1" aria-hidden="true"></i>{{ team.event.location }}</span>
      <span v-if="team.closesAt" class="text-caption text-body-secondary ms-auto">Closes {{ formatDate(team.closesAt) }}</span>
    </div>

    <p class="mb-4">{{ team.pitch }}</p>

    <!-- how full the team is -->
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-baseline mb-1">
        <span class="fw-semibold">{{ filled }} of {{ team.teamSize }} spots filled</span>
        <span class="small fw-semibold" :class="team.slotsOpen > 0 ? 'text-primary' : 'text-body-secondary'">{{ neededText }}</span>
      </div>
      <div class="progress team-progress" role="progressbar" :aria-valuenow="filled" aria-valuemin="0" :aria-valuemax="team.teamSize" :aria-label="filled + ' of ' + team.teamSize + ' spots filled'">
        <div class="progress-bar" :style="{ width: (filled / team.teamSize) * 100 + '%' }"></div>
      </div>
    </div>

    <h3 class="h5 fw-semibold mb-3">Who's in the team</h3>
    <div class="people-grid mb-3">
      <button
        v-for="member in members"
        :key="member.user._id"
        type="button"
        class="person"
        :class="{ 'is-open': openMemberId === member.user._id }"
        :aria-expanded="openMemberId === member.user._id"
        :aria-label="'See ' + getDisplayName(member.user) + '\'s profile'"
        @click="toggleMember(member)"
      >
        <span class="person-ring">
          <UserAvatar :user-id="member.user._id" :name="getDisplayName(member.user)" :avatar-updated-at="member.user.avatar?.updatedAt ?? ''" :size="76" />
          <span v-if="member.isLead" class="lead-crown rounded-circle d-flex align-items-center justify-content-center" title="Team lead">
            <i class="bi bi-star-fill" aria-hidden="true"></i>
          </span>
        </span>
        <span class="person-name fw-semibold text-truncate">{{ getDisplayName(member.user).split('@')[0] }}</span>
        <span class="person-role text-caption text-truncate" :class="member.isLead ? 'text-primary fw-semibold' : 'text-body-secondary'">{{ roleOf(member) }}</span>
      </button>

      <!-- teammates the lead already has who are not on TechTrek -->
      <div v-for="index in externalSpots" :key="'external' + index" class="person is-static">
        <span class="person-ring">
          <span class="spot spot-external rounded-circle d-flex align-items-center justify-content-center">
            <i class="bi bi-person-fill" aria-hidden="true"></i>
          </span>
        </span>
        <span class="person-name fw-semibold">Teammate</span>
        <span class="person-role text-caption text-body-secondary">Not on TechTrek</span>
      </div>

      <!-- empty spots still to fill -->
      <div v-for="index in openSpots" :key="'open' + index" class="person is-static">
        <span class="person-ring">
          <span class="spot spot-open rounded-circle d-flex align-items-center justify-content-center">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </span>
        </span>
        <span class="person-name fw-semibold text-primary">Open spot</span>
        <span class="person-role text-caption text-body-secondary">Could be you</span>
      </div>
    </div>

    <!-- the clicked member's profile -->
    <div v-if="openMember" class="profile-panel rounded-3 p-3 mb-4">
      <div class="d-flex align-items-center gap-3 mb-2">
        <UserAvatar :user-id="openMember.user._id" :name="getDisplayName(openMember.user)" :avatar-updated-at="openMember.user.avatar?.updatedAt ?? ''" :size="44" />
        <div class="min-w-0">
          <p class="fw-semibold mb-0">{{ getDisplayName(openMember.user) }}</p>
          <p class="small text-body-secondary mb-0">
            {{ roleOf(openMember) }}<template v-if="getSchoolLine(openMember.user) !== ''"> · {{ getSchoolLine(openMember.user) }}</template>
          </p>
        </div>
      </div>
      <div v-if="openMember.user.skills?.length" class="d-flex flex-wrap gap-1 mb-2">
        <span v-for="skill in openMember.user.skills" :key="skill" class="badge rounded-pill fw-medium bg-white border text-body">{{ skill }}</span>
      </div>
      <p v-else class="small text-body-secondary mb-2">No skills added yet.</p>
      <div v-if="safeHttpUrl(openMember.user.githubUrl) || safeHttpUrl(openMember.user.linkedinUrl)" class="d-flex gap-3 small">
        <a v-if="safeHttpUrl(openMember.user.githubUrl)" :href="safeHttpUrl(openMember.user.githubUrl)" target="_blank" rel="noopener noreferrer" class="fw-semibold text-decoration-none">
          <i class="bi bi-github me-1" aria-hidden="true"></i>GitHub
        </a>
        <a v-if="safeHttpUrl(openMember.user.linkedinUrl)" :href="safeHttpUrl(openMember.user.linkedinUrl)" target="_blank" rel="noopener noreferrer" class="fw-semibold text-decoration-none">
          <i class="bi bi-linkedin me-1" aria-hidden="true"></i>LinkedIn
        </a>
      </div>
    </div>
    <p v-else class="small text-body-secondary mb-4">Tap someone to see their profile.</p>

    <template v-if="team.skills.length > 0">
      <h3 class="h5 fw-semibold mb-2">Skills they're looking for</h3>
      <div class="d-flex flex-wrap gap-2">
        <span
          v-for="skill in team.skills"
          :key="skill"
          class="badge rounded-pill fw-medium border"
          :class="isMine(skill) ? 'bg-primary-subtle text-primary-emphasis border-primary-subtle' : 'bg-transparent text-body'"
        >
          <i v-if="isMine(skill)" class="bi bi-check-lg me-1" aria-hidden="true"></i>{{ skill }}
        </span>
      </div>
      <p v-if="team.skills.some(isMine)" class="text-caption text-body-secondary mt-2 mb-0">Ticked skills match your profile.</p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-light fw-semibold" @click="$emit('close')">Close</button>
      <button v-if="canRequest" type="button" class="btn btn-primary fw-semibold" @click="$emit('request')">Request to join</button>
    </template>
  </TeamModal>
</template>

<style scoped>
.team-progress {
  height: 10px;
  background-color: var(--bs-secondary-bg);
}

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 16px 8px;
}

.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 6px 4px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--bs-body-color);
  transition: background-color 0.15s ease;
}
button.person:hover,
.person.is-open {
  background-color: var(--bs-secondary-bg);
}
button.person:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.person-ring {
  position: relative;
  display: inline-flex;
  margin-bottom: 6px;
  border-radius: 50%;
  transition: transform 0.18s ease;
}
button.person:hover .person-ring {
  transform: translateY(-2px);
}
.person.is-open .person-ring {
  box-shadow: 0 0 0 3px var(--bs-primary);
}
.person-ring :deep(span.rounded-circle) {
  border-width: 3px !important;
  box-shadow: 0 2px 8px rgba(28, 26, 61, 0.12);
}

.person-name,
.person-role {
  max-width: 100%;
}

.lead-crown {
  position: absolute;
  right: -2px;
  bottom: 2px;
  width: 24px;
  height: 24px;
  font-size: 12px;
  color: #fff;
  background-color: var(--tt-status-interview);
  border: 2px solid var(--bs-white);
}

.spot {
  width: 76px;
  height: 76px;
  font-size: 26px;
}
.spot-open {
  border: 2px dashed var(--bs-primary);
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
.spot-external {
  color: var(--bs-secondary-color);
  background-color: var(--bs-secondary-bg);
}

.profile-panel {
  background-color: var(--bs-secondary-bg);
}

@media (prefers-reduced-motion: reduce) {
  .person-ring {
    transition: none;
  }
  button.person:hover .person-ring {
    transform: none;
  }
}
</style>
