<script setup>
const route = useRoute()
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import FeedbackCard from '@/components/FeedbackCard.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import './practicequizview.css'
const applicationId = route.params.applicationId;
const questionId = route.params.questionId
const completedQuestions = ref([])
const errorMessage = ref('')
const feedbackLoading = ref(false)
const submitted = ref(false)
const practiceQuestions = ref([])
const currentQuestionIndex = ref(0)
const answer = ref('')
const feedback = ref(null)
async function getQuestions() {
  if (questionId) {
    const response = await axios.get(
  `http://localhost:8000/interview/question/${questionId}`
   )  
    practiceQuestions.value = [response.data]
    const question = questions.find(
      q => q.id === Number(questionId)
    )
  }
  else if (applicationId)  {
    try {
      errorMessage.value = ''
      const response = await axios.post(
        'http://localhost:8000/interview/questions',
        {
          applicationId
        }
      )
      practiceQuestions.value = response.data.questions
    } catch (error) {
      console.error(error)
      errorMessage.value =
        'Unable to generate interview questions right now. Please try again later.'
    }

    practiceQuestions.value = response.data.questions
  }
}

async function submitAnswer() {
  feedbackLoading.value = true
  submitted.value = true
  const response = await axios.post(
    'http://localhost:8000/interview/feedback',
    {
      applicationId,
      question: practiceQuestions.value[currentQuestionIndex.value].question,
      answer: answer.value
    }
  )
  feedback.value = response.data.feedback
  feedbackLoading.value = false
  completedQuestions.value.push({
   questionId:practiceQuestions.value[currentQuestionIndex.value].questionId,
   question: practiceQuestions.value[currentQuestionIndex.value].question,
   type: practiceQuestions.value[currentQuestionIndex.value].type,
   difficulty:practiceQuestions.value[currentQuestionIndex.value].difficulty,
   score:   feedback.value.score})
  if (currentQuestionIndex.value ===practiceQuestions.value.length - 1) {
  await axios.post('http://localhost:8000/interview/attempt',{applicationId,
      questions: completedQuestions.value})
} 
}

function nextQuestion() {
  if (currentQuestionIndex.value < practiceQuestions.value.length - 1) {
    currentQuestionIndex.value++
  }
  answer.value = ''
  feedback.value = null
  submitted.value = false
}


onMounted(() => {
  getQuestions()
})
</script>

<template>
  <div v-if="errorMessage" style = "text-align:center" class="error-message">
  {{ errorMessage }}
</div>
  <div style = "text-align:center" v-if = "practiceQuestions.length === 0">Generating questions....</div>
  <div v-if="practiceQuestions.length > 0">
    <div class="progress-bar-container">
        <div class="progress-bar"
            :style="{ width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%` }">
        </div>
    </div>
    <p class="practice-info">
      Question {{ currentQuestionIndex + 1 }} of {{ practiceQuestions.length }}
    </p>

    <div class="practice-layout">
      <div class="question-container">
  <QuestionCard
    :question="practiceQuestions[currentQuestionIndex]"
  />
  <textarea
    v-model="answer"
    class="answer-box"
    placeholder="Type your answer here..."
  />

  <div class="submit">
    <button 
      class="submit-btn"
      @click="submitAnswer"
      :disabled="submitted"
    >
        {{ submitted ? 'Answer Submitted' : 'Submit for Feedback' }}
    </button>
     </div>
  </div>
      <div style = "text-align:center" v-if = "feedbackLoading">Generating feedback....</div>
      <FeedbackCard v-else-if="feedback" :feedback="feedback" :isLastQuestion="currentQuestionIndex === practiceQuestions.length - 1"  @next="nextQuestion"
      />

    </div>
    </div>

</template>

