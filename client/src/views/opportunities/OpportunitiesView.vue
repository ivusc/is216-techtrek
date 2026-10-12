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
    <p>Internships,jobs and hackathons-pulled live from Adzuna and Devpost</p>

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
      <div class = "organisation">
        <div class="avatar">
          {{ item.organisation?.slice(0, 2).toUpperCase() }}
        </div>
        <h3 class = "org-name">{{ item.organisation }}</h3>

      </div>
        <p>
          <strong>Title: {{ item.title.split('-')[0] }}</strong>
        </p>
        <div class = "badge">
          Type:{{ item.type[0].toUpperCase() + item.type.slice(1) }}
        </div>
        <p style = "margin-top:5px" v-if = "item.minSalary" >
          Minimum salary: ${{ item.minSalary }}/month
        </p>
        <hr>
        <div class = "bottom-info">
          <p>via {{ item.source }}</p>
          <div  class="card-actions">
            <div class = "bottom-buttons">
              <button class = "details-btn" v-if = "item.type == 'job'">
                <a :href="item.url"
                class="details-link"
              >
                View details
              </a></button>
                
              <button v-if = "item.type =='hackathon'" class="team-btn">
                Find Team
              </button>
              <button class="track-btn">
                + Track
              </button>
            </div>

            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 32px;
}

.tabs {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid #ddd;
  margin-bottom: 32px;
}

.tab {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  padding: 16px 0;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 12,8px;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.card {
  width: 300px;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px;
}
.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  color:white;
  background-color:#00AFB9;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
}
.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-btn {
  background-color: #00afb9;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
}
.team-btn,.details-btn{
  background-color:#FDFCDC;
  color: black;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
}
.avatar {
  width: 52px;
  height: 52px;
  background-color: #f8d7b5;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: 500;
  color: #16364b;
}
.organisation{
  display:flex;
  gap:10px;
}
.org-name{
  margin-top:6px;
}
.bottom-info{
  display:flex;
  justify-content:space-between
}
.bottom-buttons{
  display:flex;
  gap:10px;
}
</style>