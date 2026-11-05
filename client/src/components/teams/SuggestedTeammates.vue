<script setup>
import { computed, ref, useId } from 'vue';
import { getDisplayName, getSchoolLine, sameSkill, uniqueRoles } from '@/utils/team';
import { safeHttpUrl } from '@/utils/url';
import { inviteToTeam, getErrorMessage } from '@/services/teamService';
import UserAvatar from '@/components/UserAvatar.vue';

// people open to teams whose skills match what my team is looking for. The lead can invite each
// of them in one click, for the open role that fits them best (or another one they pick).
const emit = defineEmits(['invited']);

const props = defineProps({
  matches: { type: Array, required: true },
  team: { type: Object, default: null }, // my team, for its id and open roles
});

const open = ref(false);
const listId = useId();

const summary = computed(() =>
  props.matches.length === 1
    ? '1 person matches your team'
    : `${props.matches.length} people match your team`,
);

function profileLinks(person) {
  return [
    { label: 'GitHub', icon: 'bi-github', href: safeHttpUrl(person.githubUrl) },
    { label: 'LinkedIn', icon: 'bi-linkedin', href: safeHttpUrl(person.linkedinUrl) },
  ].filter((link) => link.href);
}

// the open roles the invite can be for
const openRoles = computed(() => uniqueRoles(props.team?.openRoles ?? []));

// the role each person is invited for: one whose name matches a skill of theirs, else the first open role
const chosenRoles = ref({});
function roleFor(person) {
  if (chosenRoles.value[person._id] !== undefined) return chosenRoles.value[person._id];
  const skills = person.matchedSkills ?? [];
  return (
    openRoles.value.find((role) => skills.some((skill) => sameSkill(skill, role) || role.toLowerCase().includes(skill.toLowerCase()))) ??
    openRoles.value[0] ??
    ''
  );
}
function pickRole(person, role) {
  chosenRoles.value = { ...chosenRoles.value, [person._id]: role };
}

// 'invited' or 'requested' from the server, plus the invites sent from here
const sentTo = ref({});
const busyId = ref('');
const errors = ref({});

function stateOf(person) {
  return sentTo.value[person._id] ?? person.pending ?? null;
}

async function invite(person) {
  if (!props.team || busyId.value) return;
  busyId.value = person._id;
  errors.value = { ...errors.value, [person._id]: '' };
  try {
    const role = roleFor(person);
    await inviteToTeam(props.team._id, role ? { userId: person._id, role } : { userId: person._id });
    sentTo.value = { ...sentTo.value, [person._id]: 'invited' };
    // the team's open-role circle shows them as invited straight away
    emit('invited', {
      role: role || null,
      user: { _id: person._id, displayName: person.displayName, avatar: person.avatar },
    });
  } catch (error) {
    errors.value = { ...errors.value, [person._id]: getErrorMessage(error) };
  }
  busyId.value = '';
}
</script>

<template>
  <div class="suggested-teammates rounded-3 bg-body-secondary p-2">
    <p v-if="matches.length === 0" class="small text-body-secondary mb-0 px-1">
      No one open to teams has these skills yet.
    </p>
    <template v-else>
      <button
        type="button"
        class="btn btn-sm btn-link w-100 d-flex align-items-center gap-2 fw-semibold text-decoration-none px-1"
        :aria-expanded="open"
        :aria-controls="listId"
        @click="open = !open"
      >
        <i class="bi bi-stars" aria-hidden="true"></i>
        <span class="me-auto">{{ summary }}</span>
        <i class="bi" :class="open ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
      </button>

      <ul v-show="open" :id="listId" class="list-unstyled d-flex flex-column gap-2 mb-0 mt-1">
        <li
          v-for="person in matches"
          :key="person._id"
          class="suggested-person bg-white rounded-3 p-2"
        >
          <div class="d-flex align-items-start gap-2">
            <UserAvatar
              :user-id="person._id"
              :name="getDisplayName(person)"
              :avatar-updated-at="person.avatar?.updatedAt"
              :size="32"
            />
            <div class="flex-grow-1 min-w-0">
              <p class="small fw-semibold mb-0 text-truncate">
                <RouterLink :to="'/people/' + person._id" class="link-body-emphasis link-offset-2 link-underline-opacity-0 link-underline-opacity-75-hover">{{ getDisplayName(person) }}</RouterLink>
                <a
                  v-for="link in profileLinks(person)"
                  :key="link.label"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-body-secondary ms-2"
                  :aria-label="`${getDisplayName(person)} on ${link.label}`"
                >
                  <i :class="`bi ${link.icon}`" aria-hidden="true"></i>
                </a>
              </p>
              <p v-if="getSchoolLine(person) !== ''" class="text-caption text-body-tertiary mb-1">
                {{ getSchoolLine(person) }}
              </p>
              <div class="d-flex flex-wrap gap-1">
                <span class="visually-hidden">Matches:</span>
                <span
                  v-for="skill in person.matchedSkills"
                  :key="skill"
                  class="matched-skill badge rounded-pill fw-normal border bg-primary-subtle text-primary-emphasis border-primary-subtle"
                >
                  {{ skill }}
                </span>
              </div>
            </div>

            <!-- one click: invite them for the role picked below -->
            <template v-if="team">
              <span
                v-if="stateOf(person) === 'invited'"
                class="invite-state badge rounded-pill fw-semibold bg-success-subtle text-success-emphasis"
                role="status"
              >
                <i class="bi bi-check-lg me-1" aria-hidden="true"></i>Invited
              </span>
              <span
                v-else-if="stateOf(person) === 'requested'"
                class="invite-state badge rounded-pill fw-semibold bg-info-subtle text-body"
                title="They already asked to join. Answer them on the Requests tab."
              >
                Asked to join
              </span>
              <button
                v-else
                type="button"
                class="invite-button btn btn-sm btn-primary fw-semibold flex-shrink-0"
                :disabled="busyId === person._id"
                :aria-label="`Invite ${getDisplayName(person)}${roleFor(person) ? ' as ' + roleFor(person) : ''}`"
                @click="invite(person)"
              >
                <i class="bi bi-send me-1" aria-hidden="true"></i>{{ busyId === person._id ? 'Inviting…' : 'Invite' }}
              </button>
            </template>
          </div>

          <!-- which open role the invite is for -->
          <div
            v-if="team && openRoles.length > 0 && !stateOf(person)"
            class="invite-role d-flex align-items-center gap-1 text-caption text-body-tertiary mt-2"
          >
            <label :for="'invite-role-' + person._id">Invite as</label>
            <select
              v-if="openRoles.length > 1"
              :id="'invite-role-' + person._id"
              class="form-select form-select-sm role-select py-0"
              :value="roleFor(person)"
              @change="pickRole(person, $event.target.value)"
            >
              <option v-for="role in openRoles" :key="role" :value="role">{{ role }}</option>
            </select>
            <span v-else :id="'invite-role-' + person._id" class="fw-semibold text-body-secondary">{{ openRoles[0] }}</span>
          </div>
          <p v-else-if="stateOf(person) === 'invited' && sentTo[person._id]" class="text-caption text-body-tertiary mt-2 mb-0">
            Sent! They'll see it on their Teams page{{ roleFor(person) ? ' as ' + roleFor(person) : '' }}.
          </p>
          <p v-if="errors[person._id]" class="text-caption text-tt-accent mt-2 mb-0" role="alert">{{ errors[person._id] }}</p>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.suggested-person {
  transition: box-shadow 0.15s ease;
}
.suggested-person:hover {
  box-shadow: 0 2px 8px rgba(28, 26, 61, 0.08);
}

.invite-state {
  flex-shrink: 0;
  animation: invite-pop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}
@keyframes invite-pop {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.role-select {
  width: auto;
  max-width: 100%;
  font-size: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .suggested-person,
  .invite-state {
    transition: none;
    animation: none;
  }
}
</style>
