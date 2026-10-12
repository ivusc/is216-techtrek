<script setup>
import axios from 'axios'
import { ref, onMounted, computed } from 'vue'

const jobs = ref([])
const hackathons = ref([])

const activeTab = ref('all')

const loadData = async () => {
  try {
    const response = await axios.get(
      'http://localhost:8000/opportunity/all'
    )

    jobs.value = response.data.jobs.jobs
    hackathons.value = response.data.hackathons.hackathons
  } catch (error) {
    console.error(error)
  }
}

onMounted(loadData)

const displayedItems = computed(() => {
  if (activeTab.value === 'jobs') {
    return jobs.value
  }

  if (activeTab.value === 'hackathons') {
    return hackathons.value
  }

  const allItems = []

  for (const job of jobs.value) {
    allItems.push(job)
  }

  for (const hackathon of hackathons.value) {
    allItems.push(hackathon)
  }

  return allItems
})
</script>

<template>
  <div class="page">
    <h1>Discover</h1>

    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        All
        <span class="count">
          {{ jobs.length + hackathons.length }}
        </span>
      </button>

      <button
        class="tab"
        :class="{ active: activeTab === 'jobs' }"
        @click="activeTab = 'jobs'"
      >
        Jobs & Internships
        <span class="count">
          {{ jobs.length }}
        </span>
      </button>

      <button
        class="tab"
        :class="{ active: activeTab === 'hackathons' }"
        @click="activeTab = 'hackathons'"
      >
        Hackathons
        <span class="count">
          {{ hackathons.length }}
        </span>
      </button>
    </div>

    <div class="cards-container">
      <div
        v-for="item in displayedItems"
        :key="item.externalId"
        class="card"
      >
        <h3>{{ item.title }}</h3>

        <p>
          <strong>Organisation:</strong>
          {{ item.organisation }}
        </p>

        <p>
          <strong>Location:</strong>
          {{ item.location }}
        </p>

        <p>
          <strong>Type:</strong>
          {{ item.type }}
        </p>

        <a :href="item.url">
          View Opportunity
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 2rem;
}

.tabs {
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid #ddd;
  margin-bottom: 2rem;
}

.tab {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  padding: 1rem 0;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab.active {
  color: #0284c7;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 3px;
  background-color: #0284c7;
}

.count {
  background-color: #f1f5f9;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.8rem;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.card {
  width: 300px;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 1rem;
}
</style>