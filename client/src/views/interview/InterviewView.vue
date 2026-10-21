<script setup>
import {ref,computed,onMounted} from 'vue'
import './interview.css'
const difficulties = ['Easy','Medium','Hard']
const questionTypes = ['Behavioural','Technical','System Design','Case']
const selectedTitle = ref('')
const selectedDifficulty = ref('')
const selectedTypes = ref([])
import axios from 'axios'
const applicationCards = ref([])
const titles = ref([])
const questions = ref([])
const questionScores = ref({})
const isLoading = ref(true)  
const loadData = async () => {
  isLoading.value = true
  try {
    const response = await axios.get(
      'http://localhost:8000/interview/dashboard'
    )
    applicationCards.value = response.data.applicationCards
    titles.value = response.data.titles
    questions.value = response.data.allQuestions
    questionScores.value = response.data.questionScores
  } catch (error) {
    console.error(error)
    status.value = 'Failed to load interview dashboard.'
  }
  isLoading.value = false
}

onMounted(loadData)
const filteredQuestions = computed(() => {
  if (
  selectedTitle.value === '' &&
  selectedDifficulty.value === '' &&
  selectedTypes.value.length === 0
) {
  return questions.value
}

return questions.value.filter(q =>
  (selectedTitle.value === '' || q.title === selectedTitle.value) &&
  (selectedTypes.value.length === 0 || selectedTypes.value.includes(q.type)) &&
  (selectedDifficulty.value === '' || q.difficulty === selectedDifficulty.value)
)
})
</script>
<template>
  <div v-if = "isLoading" style = "text-align:center;">
    Loading content....
  </div>
  <div v-else>
    <h1>Interview Prep</h1>
  <p style = "text-align:center;">Practice by role and question type.Gemini gives instant feedback on every answer</p>
  <div class = "container">  
  <div>
    <div class="card" style = "background-color:white">
      <div class="card-body">

        <p class = "filter-title">Filters</p>

        <p class = "filter-heading">Role</p>
        <div v-for = "title in titles" style = "margin-bottom:10px">
          <input type="radio" name="title" v-model = "selectedTitle" :value = title id="">  {{ title }}
        </div>
        
        <p class = "filter-heading">Question Type</p>
        <div v-for = "type in questionTypes" style = "margin-bottom:10px">
          <input type="checkbox" v-model = "selectedTypes"  name="types" :value = type id="">  {{ type }}
        </div>

        <p class = "filter-heading">Difficulty</p>
        <div class = "difficulty" v-for = "d in difficulties" style = "margin-bottom:10px">
          <input type="radio" v-model = "selectedDifficulty"  name="difficulty" :value = d id="">  {{ d }}
        </div>

      </div>
    </div>
  </div>
  <div>
    <div class = "interview-list">
      <div class = "interview-card" v-for = "application in applicationCards">
    <p class="job-title">{{ application.title }} at {{  application.company }}</p>
    <p class="interview-date">
      Applied: {{ application.createdAt.substring(0, 10) }}
    </p>
    <p v-if = "application.deadline" class="interview-date">
      Deadline: {{ application.deadline.substring(0,10) }}
    </p>
    <RouterLink
      class="practice-btn"
      :to="`/practice/${application.applicationId}`"
    >
      ➝ Start 5 question-session
    </RouterLink>
    
      </div>
      
    </div>
    <div class="question-bank">
  <p class="question-bank-title">Question Bank</p>

  <div
    class="question-card"
    v-for="question in filteredQuestions"
  >

    <div>
      <p class="question-text">
        {{ question.question }}
      </p>
<!-- to display the high score for the question  -->
      <!-- <span class="high-score">
      {{ questionScores[question.questionId]?.highScore }}/10
    </span> -->
      <p class="question-info">
        {{ question.type }} · {{ question.title }} · {{ question.difficulty }}
      </p>
    </div>

    <RouterLink
  class="question-practice-btn"
  :to="`/practice/question/${question.questionId}`"
>
  Practice Again
</RouterLink>
  </div>
</div>
  </div>

</div>
  </div>
  
</template>

