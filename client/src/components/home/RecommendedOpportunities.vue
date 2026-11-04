<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import OpportunityCard from '@/components/opportunities/OpportunityCard.vue'
import { useOpportunityStore } from '@/store/opportunity'
import { isClosed } from '@/utils/opportunity'

const props = defineProps({
  skills: { type: Array, required: true }
})

const router = useRouter()
const opportunityStore = useOpportunityStore()
const { jobs, hackathons } = storeToRefs(opportunityStore)

// "Vue.js" -> "vue", so it also matches listings that only say "Vue"
function skillWord(skill) {
  return skill.toLowerCase().replace(/\.js$/, '').trim()
}

function matchCount(item) {
  const text = [item.title, item.description, ...(item.themes ?? [])].join(' ').toLowerCase()
  return props.skills.filter((skill) => skillWord(skill) !== '' && text.includes(skillWord(skill))).length
}

// best matching open job and best matching open hackathon that are not tracked yet
const recommended = computed(() => {
  const picks = []
  for (const list of [jobs.value, hackathons.value]) {
    let best = null
    let bestScore = -1
    for (const item of list) {
      if (isClosed(item) || opportunityStore.isSaved(item)) continue
      const score = matchCount(item)
      if (score > bestScore) {
        best = item
        bestScore = score
      }
    }
    if (best) picks.push(best)
  }
  return picks
})
</script>

<template>
  <div class="flex-shrink-0">
    <div class="d-flex justify-content-between align-items-end mb-2">
      <h2 class="h5 fw-semibold mb-0">
        <template v-if="skills.length > 0">Based on your skills: {{ skills.slice(0, 3).join(', ') }}</template>
        <template v-else>Fresh picks for you</template>
      </h2>
      <RouterLink to="/opportunities" class="small fw-semibold text-decoration-none text-nowrap">See all in Discover</RouterLink>
    </div>
    <p v-if="skills.length === 0" class="small text-body-secondary mb-2">
      Add your skills on the <RouterLink to="/teams">Teams</RouterLink> page to get better matches.
    </p>
    <div class="row g-3">
      <div v-for="item in recommended" :key="item.source + '-' + item.externalId" class="col-12 col-md-6">
        <OpportunityCard
          :item="item"
          :saved="opportunityStore.isSaved(item)"
          :team-count="opportunityStore.teamCountFor(item)"
          @find-team="router.push({ path: '/teams', query: { event: item.title } })"
          @details="router.push('/opportunities')"
          @toggle-save="opportunityStore.toggleSave(item)"
        />
      </div>
    </div>
  </div>
</template>
