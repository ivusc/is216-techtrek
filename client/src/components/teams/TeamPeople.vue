<script setup>
import { computed, ref, watch } from 'vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { safeHttpUrl } from '@/utils/url'
import { emailLink, getDisplayName, getSchoolLine, uniqueRoles } from '@/utils/team'

// the team as a row of profile circles: the lead (starred), the members with their roles, teammates
// not on TechTrek, and the open spots. Click a member to see their profile, or an open spot to
// invite someone or copy the team's link. Used by the team details and the request-to-join windows.
const props = defineProps({
  team: { type: Object, required: true },
  // in the request window: me in the first open spot, with the role I picked { id, name, avatarUpdatedAt, role }
  you: { type: Object, default: null },
  // team details window: a role change is being saved, or it failed
  savingRole: { type: Boolean, default: false },
  roleError: { type: String, default: '' }
})

const emit = defineEmits(['invite', 'assign-role', 'pick-role'])

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
// in the request window I'm shown in a circle once I've picked a role (a team without open roles
// shows me straight away). Until then every open role keeps its own circle to tap.
const shownYou = computed(() => {
  if (!props.you) return null
  if ((props.team.openRoles ?? []).length > 0 && !props.you.role) return null
  return props.you
})

// the open spots in order, one per open role (spots past the roles have none). In the request
// window I sit in the spot of the role I picked, so picking another role moves me there.
const spots = computed(() => {
  const roles = props.team.openRoles ?? []
  const list = Array.from({ length: Math.max(props.team.slotsOpen, 0) }, (_, index) => ({
    kind: 'open',
    index,
    role: roles[index] ?? null
  }))
  if (shownYou.value && list.length > 0) {
    const mine = String(shownYou.value.role ?? '').toLowerCase()
    const match = list.findIndex((spot) => spot.role !== null && spot.role.toLowerCase() === mine)
    list[match === -1 ? 0 : match] = { kind: 'you', index: match === -1 ? 0 : match }
  }
  return list
})
const openSpots = computed(() => spots.value.filter((spot) => spot.kind === 'open'))

function roleOf(member) {
  if (member.isLead) return 'Team lead'
  return member.role || 'Member'
}

// one panel opens under the circles: a member's profile, or the invite/share box for an open spot
const openId = ref(null)
const openMember = computed(() => members.value.find((member) => member.user._id === openId.value) ?? null)
const sharing = computed(() => String(openId.value).startsWith('share'))
const sharingRole = computed(() => (sharing.value ? openSpots.value.find((spot) => 'share' + spot.index === openId.value)?.role ?? null : null))

// where the card's little arrow points: the middle of the circle that was clicked
const arrowX = ref(48)

function toggle(id, event) {
  const button = event?.currentTarget
  if (button?.offsetWidth) arrowX.value = button.offsetLeft + button.offsetWidth / 2
  openId.value = openId.value === id ? null : id
  copied.value = false
  roleSaved.value = false
  const member = members.value.find((candidate) => candidate.user._id === id)
  roleDraft.value = member?.role ?? ''
}

// once the card has popped up, scroll just enough to show all of it
function showCard(card) {
  card.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
}

// in the request window, tapping an open role picks it (I move into that circle);
// anywhere else, an open spot opens the invite / share box
function openSpotClicked(spot) {
  if (props.you && spot.role) {
    openId.value = null
    emit('pick-role', spot.role)
    return
  }
  toggle('share' + spot.index)
}

// picking a different role closes the share box, so only my circle is highlighted
watch(
  () => props.you?.role,
  () => {
    if (sharing.value) openId.value = null
  }
)

// the lead gives the open member a role
const isLeader = computed(() => props.team.isLeader === true)
const roleDraft = ref('')
const roleSaved = ref(false)
let waitingForSave = false
const roleChanged = computed(() => roleDraft.value.trim() !== (openMember.value?.role ?? ''))

function saveRole() {
  if (!openMember.value || !roleChanged.value) return
  roleSaved.value = false
  waitingForSave = true
  emit('assign-role', { userId: openMember.value.user._id, role: roleDraft.value.trim() })
}

// the parent swaps in the updated team once it's saved
watch(
  () => props.team,
  () => {
    if (!waitingForSave) return
    waitingForSave = false
    roleSaved.value = true
    roleDraft.value = openMember.value?.role ?? ''
  }
)
watch(
  () => props.roleError,
  (error) => {
    if (error) waitingForSave = false
  }
)

// the Teams page opens the join form for ?team=<id>
// an open role's link also names the role, so the request window opens with it picked
const teamLink = computed(() => {
  const link = window.location.origin + '/teams?team=' + props.team._id
  return sharingRole.value ? link + '&role=' + encodeURIComponent(sharingRole.value) : link
})
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
  <div class="position-relative">
    <TransitionGroup tag="div" name="spot" class="people-grid mb-3">
      <button
        v-for="member in members"
        :key="member.user._id"
        type="button"
        class="person"
        :class="{ 'is-open': openId === member.user._id }"
        :aria-expanded="openId === member.user._id"
        :aria-label="'See ' + getDisplayName(member.user) + '\'s profile'"
        @click="toggle(member.user._id, $event)"
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

      <!-- the open spots in order; in the request window I sit in the spot of the role I picked -->
      <template v-for="spot in spots" :key="spot.kind === 'you' ? 'you' : 'open' + spot.index">
        <div v-if="spot.kind === 'you'" class="person is-static is-you" :class="{ 'is-chosen': Boolean(shownYou.role) }">
          <span class="person-ring you-ring">
            <UserAvatar :user-id="shownYou.id ?? ''" :name="shownYou.name ?? ''" :avatar-updated-at="shownYou.avatarUpdatedAt ?? ''" :size="76" />
          </span>
          <span class="person-name fw-semibold text-primary">You</span>
          <span class="person-role text-caption text-body-secondary text-truncate">{{ shownYou.role || 'Your spot' }}</span>
        </div>

        <!-- an empty spot: in the request window it picks its role, elsewhere it opens invite / share -->
        <button
          v-else
          type="button"
          class="person"
          :class="{ 'is-open': openId === 'share' + spot.index }"
          :aria-expanded="you && spot.role ? undefined : openId === 'share' + spot.index"
          :aria-label="you && spot.role ? 'Ask to be the ' + spot.role : spot.role ? 'Invite someone to be the ' + spot.role : 'Invite someone to this open spot'"
          @click="openSpotClicked(spot)"
        >
          <span class="person-ring">
            <span class="spot spot-open rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
            </span>
          </span>
          <span class="person-name spot-name fw-semibold text-primary">{{ spot.role ?? 'Open spot' }}</span>
          <span class="person-role text-caption text-body-secondary">{{ you && spot.role ? 'Tap to pick' : spot.role ? 'Open role' : canInvite ? 'Invite someone' : you ? 'Invite a friend' : 'Could be you' }}</span>
        </button>
      </template>
    </TransitionGroup>

    <!-- the clicked member's profile card pops up under the circles, pointing at them -->
    <Transition name="card-pop" mode="out-in" @after-enter="showCard">
      <section
        v-if="openMember"
        :key="openMember.user._id"
        class="people-panel member-card rounded-4"
        :style="{ '--arrow-x': arrowX + 'px' }"
        :aria-label="getDisplayName(openMember.user) + '\'s profile'"
      >
        <div class="member-banner bg-primary position-relative overflow-hidden" aria-hidden="true">
          <span class="banner-dot banner-dot-teal"></span>
          <span class="banner-dot banner-dot-coral"></span>
        </div>
        <button type="button" class="member-close btn-close btn-close-white" aria-label="Close profile" @click="openId = null"></button>
        <div class="px-3 pb-3">
          <div class="member-head d-flex align-items-end gap-3 mb-2">
            <UserAvatar :user-id="openMember.user._id" :name="getDisplayName(openMember.user)" :avatar-updated-at="openMember.user.avatar?.updatedAt ?? ''" :size="68" class="member-avatar" />
            <div class="min-w-0 me-auto">
              <p class="h5 fw-semibold mb-0 text-truncate">{{ getDisplayName(openMember.user) }}</p>
              <p class="small text-body-secondary mb-0">
                <span :class="openMember.isLead ? 'text-primary fw-semibold' : ''">{{ roleOf(openMember) }}</span><template v-if="getSchoolLine(openMember.user) !== ''"> · {{ getSchoolLine(openMember.user) }}</template>
              </p>
            </div>
          </div>

          <p v-if="openMember.user.about" class="member-about mb-3">{{ openMember.user.about }}</p>
          <p v-else class="small text-body-tertiary mb-3">{{ getDisplayName(openMember.user).split(/[\s@]/)[0] }} hasn't written a description yet.</p>

          <div v-if="openMember.user.skills?.length" class="d-flex flex-wrap gap-1 mb-3">
            <span class="visually-hidden">Skills:</span>
            <span v-for="skill in openMember.user.skills" :key="skill" class="badge rounded-pill fw-medium bg-primary-subtle text-primary-emphasis border border-primary-subtle">{{ skill }}</span>
          </div>

          <!-- how to reach them (email and Telegram only reach people in the same team) -->
          <div class="d-flex flex-wrap align-items-center gap-2">
            <a v-if="openMember.user.userName" :href="emailLink(openMember.user.userName, team.name)" target="_blank" rel="noopener noreferrer" class="member-link" :aria-label="'Email ' + getDisplayName(openMember.user)" :title="openMember.user.userName">
              <i class="bi bi-envelope" aria-hidden="true"></i>
            </a>
            <a v-if="openMember.user.telegram" :href="'https://t.me/' + encodeURIComponent(openMember.user.telegram)" target="_blank" rel="noopener noreferrer" class="member-link" :aria-label="'Message ' + getDisplayName(openMember.user) + ' on Telegram'" :title="'@' + openMember.user.telegram">
              <i class="bi bi-telegram" aria-hidden="true"></i>
            </a>
            <a v-if="safeHttpUrl(openMember.user.githubUrl)" :href="safeHttpUrl(openMember.user.githubUrl)" target="_blank" rel="noopener noreferrer" class="member-link" :aria-label="getDisplayName(openMember.user) + ' on GitHub'" title="GitHub">
              <i class="bi bi-github" aria-hidden="true"></i>
            </a>
            <a v-if="safeHttpUrl(openMember.user.linkedinUrl)" :href="safeHttpUrl(openMember.user.linkedinUrl)" target="_blank" rel="noopener noreferrer" class="member-link" :aria-label="getDisplayName(openMember.user) + ' on LinkedIn'" title="LinkedIn">
              <i class="bi bi-linkedin" aria-hidden="true"></i>
            </a>
            <RouterLink :to="'/people/' + openMember.user._id" class="btn btn-sm btn-outline-primary rounded-pill fw-semibold ms-auto">
              View profile<i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </RouterLink>
          </div>

          <!-- the lead gives this person a role -->
          <form v-if="isLeader" class="role-editor rounded-3 border p-2 mt-3" @submit.prevent="saveRole">
            <label :for="'role-' + openMember.user._id" class="small fw-semibold mb-1">Role in the team</label>
            <div class="d-flex gap-2">
              <input
                :id="'role-' + openMember.user._id"
                v-model="roleDraft"
                type="text"
                class="form-control form-control-sm"
                maxlength="60"
                :placeholder="openMember.isLead ? 'Team lead' : 'e.g. Backend developer'"
                @input="roleSaved = false"
              >
              <button class="btn btn-sm fw-semibold text-nowrap" :class="roleSaved ? 'btn-success' : 'btn-primary'" type="submit" :disabled="savingRole || (!roleChanged && !roleSaved)">
                <template v-if="savingRole">Saving…</template>
                <template v-else-if="roleSaved && !roleChanged"><i class="bi bi-check-lg" aria-hidden="true"></i> Saved</template>
                <template v-else>Save role</template>
              </button>
            </div>
            <div v-if="(team.openRoles ?? []).length > 0" class="d-flex flex-wrap align-items-center gap-1 mt-2">
              <span class="text-caption text-body-tertiary">Give an open role:</span>
              <button
                v-for="role in uniqueRoles(team.openRoles)"
                :key="role"
                type="button"
                class="btn btn-sm rounded-pill bg-primary-subtle border border-primary-subtle text-primary-emphasis py-0 px-2"
                @click="roleDraft = role; roleSaved = false"
              >
                {{ role }}
              </button>
            </div>
            <p v-if="roleError" class="small text-tt-accent mt-2 mb-0" role="alert">{{ roleError }}</p>
          </form>
        </div>
      </section>

      <!-- an open spot was clicked: invite by email (lead) and share the team's link (everyone) -->
      <div v-else-if="sharing" key="share" class="people-panel share-panel rounded-3 p-3">
        <p class="fw-semibold mb-1">
          <template v-if="sharingRole">{{ canInvite ? 'Fill the ' + sharingRole + ' role' : 'Know someone for ' + sharingRole + '?' }}</template>
          <template v-else>{{ canInvite ? 'Fill this spot' : 'Know someone for this spot?' }}</template>
        </p>
        <p class="small text-body-secondary mb-3">
          <template v-if="sharingRole">This link opens {{ team.name }} on TechTrek with {{ sharingRole }} already picked, so they can ask to join for it.</template>
          <template v-else>Send them the team link. It opens {{ team.name }} on TechTrek so they can ask to join.</template>
        </p>
        <label :for="'team-link-' + team._id" class="visually-hidden">Team link</label>
        <div class="input-group">
          <input :id="'team-link-' + team._id" class="form-control" :value="teamLink" readonly @focus="$event.target.select()" />
          <button class="btn fw-semibold" :class="copied ? 'btn-success' : 'btn-primary'" type="button" @click="copyLink">
            <i :class="copied ? 'bi bi-check-lg' : 'bi bi-link-45deg'" aria-hidden="true"></i>
            {{ copied ? 'Copied!' : 'Copy link' }}
          </button>
        </div>
        <button v-if="canInvite" type="button" class="btn btn-outline-primary fw-semibold w-100 mt-2" @click="emit('invite', sharingRole ?? '')">
          <i class="bi bi-envelope" aria-hidden="true"></i> Invite by SMU email
        </button>
      </div>

      <p v-else-if="you && (team.openRoles ?? []).length > 0" key="hint-you" class="small text-body-secondary mb-0">Tap a role to ask for it, or tap someone to see their profile.</p>
      <p v-else key="hint" class="small text-body-secondary mb-0">Tap someone to see their profile, or an open spot to invite a friend.</p>
    </Transition>
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
/* the role I'm asking for: my circle gets the same solid ring and tint as a selected circle */
.person.is-you.is-chosen {
  background-color: var(--bs-primary-bg-subtle);
}
.person.is-you.is-chosen .you-ring {
  border-style: solid;
  box-shadow: 0 0 0 2px var(--bs-primary);
}
.you-ring {
  padding: 3px;
  border: 2px dashed var(--bs-primary);
  margin: -5px 0 1px;
}

.person-name,
.person-role {
  max-width: 100%;
}
/* open role names wrap onto a second line instead of being cut off */
.spot-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
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
  border: 2px solid var(--tt-surface);
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

/* the clicked person's profile card, with a little arrow pointing up at their circle */
.member-card {
  position: relative;
  margin-top: 4px;
  background-color: var(--tt-surface);
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 18px 40px -24px rgba(28, 26, 61, 0.45);
}
.member-card::before {
  content: '';
  position: absolute;
  top: -7px;
  left: clamp(20px, var(--arrow-x), calc(100% - 20px));
  width: 14px;
  height: 14px;
  background-color: var(--bs-primary);
  transform: translateX(-50%) rotate(45deg);
  border-radius: 3px 0 0 0;
}
.member-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}
.member-banner {
  height: 56px;
  border-radius: var(--bs-border-radius-xl) var(--bs-border-radius-xl) 0 0;
}
.banner-dot {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
}
.banner-dot-teal {
  width: 96px;
  top: -40px;
  right: -16px;
  background-color: var(--bs-info);
}
.banner-dot-coral {
  width: 28px;
  top: 18px;
  right: 30%;
  background-color: var(--tt-accent);
}
/* the photo sits half over the banner */
.member-head {
  margin-top: -30px;
  position: relative;
}
.member-avatar {
  border-width: 3px !important;
  box-shadow: 0 6px 16px -8px rgba(28, 26, 61, 0.4);
}
.member-about {
  line-height: 1.6;
  white-space: pre-line;
  color: var(--bs-secondary-color);
}
.member-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--bs-body-color);
  background-color: var(--bs-secondary-bg);
  text-decoration: none;
  transition: transform 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.member-link:hover {
  transform: translateY(-2px);
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}

/* the card pops up from its arrow */
.card-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  transform-origin: var(--arrow-x, 50%) top;
}
.card-pop-leave-active {
  transition: opacity 0.12s ease;
}
.card-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
.card-pop-leave-to {
  opacity: 0;
}

/* picking another role: my circle slides into that spot, and the role I left fades back in */
.spot-move {
  transition: transform 0.35s cubic-bezier(0.3, 0.9, 0.4, 1);
}
.spot-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.spot-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
/* the circle I'm moving into goes straight away, so the row never has an extra circle in it */
.spot-leave-active {
  display: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .spot-move,
  .spot-enter-active,
  .card-pop-enter-active,
  .card-pop-leave-active,
  .member-link {
    transition: none;
  }
  .person-ring {
    transition: none;
  }
  button.person:hover .person-ring {
    transform: none;
  }
}
</style>
