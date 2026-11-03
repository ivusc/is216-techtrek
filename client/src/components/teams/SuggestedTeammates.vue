<script setup>
import { computed, ref, useId } from 'vue';
import { getDisplayName, getSchoolLine } from '@/utils/team';
import { safeHttpUrl } from '@/utils/url';
import TeamAvatar from './TeamAvatar.vue';

const props = defineProps({
  matches: { type: Array, required: true },
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
          class="d-flex align-items-start gap-2 bg-white rounded-3 p-2"
        >
          <TeamAvatar :name="getDisplayName(person)" :size="32" />
          <div class="flex-grow-1 min-w-0">
            <p class="small fw-semibold mb-0 text-truncate">{{ getDisplayName(person) }}</p>
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
          <a
            v-for="link in profileLinks(person)"
            :key="link.label"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="text-body-secondary"
            :aria-label="`${getDisplayName(person)} on ${link.label}`"
          >
            <i :class="`bi ${link.icon}`" aria-hidden="true"></i>
          </a>
        </li>
      </ul>
    </template>
  </div>
</template>
