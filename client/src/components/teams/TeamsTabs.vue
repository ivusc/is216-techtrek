<script setup>
// the Teams page sections as big tappable cards (Browse, My teams, Requests), plus a card to post a team
import { computed } from 'vue'
import TabCards from '@/components/TabCards.vue'

const props = defineProps({
  counts: { type: Object, required: true }
})

const tab = defineModel('tab', { type: String, required: true })

defineEmits(['create'])

const sections = [
  { key: 'browse', label: 'Browse teams', hint: 'Find a team to join', icon: 'bi-search', unit: ['recruiting', 'recruiting'] },
  { key: 'mine', label: 'My teams', hint: 'Teams you lead or joined', icon: 'bi-people-fill', unit: ['team', 'teams'] },
  { key: 'requests', label: 'Requests', hint: 'Requests and invites', icon: 'bi-inbox-fill', unit: ['waiting', 'waiting'] }
]

const tabs = computed(() =>
  sections.map((item) => {
    const count = props.counts[item.key] ?? 0
    return {
      ...item,
      count: count + ' ' + (count === 1 ? item.unit[0] : item.unit[1]),
      news: item.key === 'requests' && count > 0
    }
  })
)

const createCard = { label: 'Create team post', hint: 'Advertise your open spots', icon: 'bi-plus-lg' }
</script>

<template>
  <TabCards
    v-model:tab="tab"
    :tabs="tabs"
    label="Teams sections"
    id-prefix="teams-tab-"
    :action="createCard"
    @action="$emit('create')"
  />
</template>
