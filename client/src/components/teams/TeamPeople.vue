<script setup>
import { computed, ref } from 'vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { safeHttpUrl } from '@/utils/url'
import { getDisplayName, getSchoolLine } from '@/utils/team'

// the team as a row of profile circles: the lead (starred), the members with their roles, teammates
// not on TechTrek, and the open spots. Click a member to see their profile, or an open spot to
// invite someone or copy the team's link. Used by the team details and the request-to-join windows.
const props = defineProps({
  team: { type: Object, required: true },
  // in the request window: me in the first open spot, with the role I picked { id, name, avatarUpdatedAt, role }
  you: { type: Object, default: null }
})

const emit = defineEmits(['invite'])

const leaderId = computed(() => String(props.team.leader?._id ?? props.team.leader ?? ''))

// the lead first, then everyone else in the order they joined
const members = computed(() => {
  const list = props.team.members.map((member) => ({
    ...member,
    isLead: String(member.user._id) === leaderId.value
  }))
  return [...list.filter((member) => member.isLead), ...list.filter((member) => !member.isLead)]
})

const externalSpots = computed(() => Array.from({ length: props.team.externalMembers ?? 0 }, (_, index) => index))
// when I am shown in the first open spot, there is one fewer empty circle
const openSpots = computed(() => Array.from({ length: Math.max(props.team.slotsOpen - (props.you ? 1 : 0), 0) }, (_, index) => index))

function roleOf(member) {
  if (member.isLead) return 'Team lead'
  return member.role || 'Member'
}

// one panel opens under the circles: a member's profile, or the invite/share box for an open spot
const openId = ref(null)
const openMember = computed(() => members.value.find((member) => member.user._id === openId.value) ?? null)
const sharing = computed(() => String(openId.value).startsWith('share'))

function toggle(id) {
  openId.value = openId.value === id ? null : id
  copied.value = false
}

// the Teams page opens the join form for ?team=<id>
const teamLink = computed(() => window.location.origin + '/teams?team=' + props.team._id)
const copied = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(teamLink.value)
  } catch {
    // older browsers: select the text so it can be copied by hand
    document.getElementById('team-link-' + props.team._id)?.select()
    return
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// only the lead can invite by email, and only while the post is open
const canInvite = computed(() => props.team.isLeader === true && props.team.status === 'open')
</script>

<template>
  <div>
    <div class="people-grid mb-3">
      <button
        v-for="member in members"
        :key="member.user._id"
        type="button"
        class="person"
        :class="{ 'is-open': openId === member.user._id }"
        :aria-expanded="openId === member.user._id"
        :aria-label="'See ' + getDisplayName(member.user) + '\'s profile'"
        @click="toggle(member.user._id)"
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

      <!-- request window: where I would go -->
      <div v-if="you" class="person is-static is-you">
        <span class="person-ring you-ring">
          <UserAvatar :user-id="you.id ?? ''" :name="you.name ?? ''" :avatar-updated-at="you.avatarUpdatedAt ?? ''" :size="76" />
        </span>
        <span class="person-name fw-semibold text-primary">You</span>
        <span class="person-role text-caption text-body-secondary text-truncate">{{ you.role || 'Your spot' }}</span>
      </div>

      <!-- empty spots: click to invite someone or share the team -->
      <button
        v-for="index in openSpots"
        :key="'open' + index"
        type="button"
        class="person"
        :class="{ 'is-open': openId === 'share' + index }"
        :aria-expanded="openId === 'share' + index"
        aria-label="Invite someone to this open spot"
        @click="toggle('share' + index)"
      >
        <span class="person-ring">
          <span class="spot spot-open rounded-circle d-flex align-items-center justify-content-center">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </span>
        </span>
        <span class="person-name fw-semibold text-primary">Open spot</span>
        <span class="person-role text-caption text-body-secondary">{{ canInvite ? 'Invite someone' : you ? 'Invite a friend' : 'Could be you' }}</span>
      </button>
    </div>

    <!-- the clicked member's profile -->
    <div v-if="openMember" class="people-panel rounded-3 p-3">
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

    <!-- an open spot was clicked: invite by email (lead) and share the team's link (everyone) -->
    <div v-else-if="sharing" class="people-panel share-panel rounded-3 p-3">
      <p class="fw-semibold mb-1">{{ canInvite ? 'Fill this spot' : 'Know someone for this spot?' }}</p>
      <p class="small text-body-secondary mb-3">
        Send them the team link. It opens {{ team.name }} on TechTrek so they can ask to join.
      </p>
      <label :for="'team-link-' + team._id" class="visually-hidden">Team link</label>
      <div class="input-group">
        <input :id="'team-link-' + team._id" class="form-control" :value="teamLink" readonly @focus="$event.target.select()" />
        <button class="btn fw-semibold" :class="copied ? 'btn-success' : 'btn-primary'" type="button" @click="copyLink">
          <i :class="copied ? 'bi bi-check-lg' : 'bi bi-link-45deg'" aria-hidden="true"></i>
          {{ copied ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
      <button v-if="canInvite" type="button" class="btn btn-outline-primary fw-semibold w-100 mt-2" @click="emit('invite')">
        <i class="bi bi-envelope" aria-hidden="true"></i> Invite by SMU email
      </button>
    </div>

    <p v-else class="small text-body-secondary mb-0">Tap someone to see their profile, or an open spot to invite a friend.</p>
  </div>
</template>

<style scoped>
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

/* me, in the spot I'm asking for: a dashed purple ring around my photo */
.you-ring {
  padding: 3px;
  border: 2px dashed var(--bs-primary);
  margin: -5px 0 1px;
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
button.person:hover .spot-open {
  border-style: solid;
}
.spot-external {
  color: var(--bs-secondary-color);
  background-color: var(--bs-secondary-bg);
}

.people-panel {
  background-color: var(--bs-secondary-bg);
}
.share-panel {
  background-color: var(--bs-primary-bg-subtle);
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
