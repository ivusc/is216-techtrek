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
    const response = await axios.post(
      'http://localhost:8000/interview/questions',
      {
        applicationId
      }
    )

    practiceQuestions.value = response.data.questions
  }
}

async function submitAnswer() {
  const response = await axios.post(
    'http://localhost:8000/interview/feedback',
    {
      applicationId,
      question: practiceQuestions.value[currentQuestionIndex.value].question,
      answer: answer.value
    }
  )

  feedback.value = response.data.feedback
  if (currentQuestionIndex.value ===practiceQuestions.value.length - 1) {
  await axios.post('http://localhost:8000/interview/attempt',{applicationId,
      questions: completedQuestions.value})
} else {
  completedQuestions.value.push({
   questionId:practiceQuestions.value[currentQuestionIndex.value].questionId,
   question: practiceQuestions.value[currentQuestionIndex.value].question,
   type: practiceQuestions.value[currentQuestionIndex.value].type,
   difficulty:practiceQuestions.value[currentQuestionIndex.value].difficulty,
   score:   feedback.value.score})
}
}

function nextQuestion() {
  if (currentQuestionIndex.value < practiceQuestions.value.length - 1) {
    currentQuestionIndex.value++
  }
  answer.value = ''
  feedback.value = null
}

function retryQuestion() {
  answer.value = ''
  feedback.value = null
}

onMounted(() => {
  getQuestions()
})
</script>

<template>
  <div v-if="practiceQuestions.length > 0">

    <p class="practice-info">
      Question {{ currentQuestionIndex + 1 }} of {{ practiceQuestions.length }}
    </p>

    <div class="practice-layout">
      <QuestionCard :question="practiceQuestions[currentQuestionIndex]" @submit="submitAnswer"
      >
        <textarea v-model="answer" class="answer-box" placeholder="Type your answer here..."
        />

      </QuestionCard>

      <FeedbackCard v-if="feedback" :feedback="feedback" :isLastQuestion="currentQuestionIndex === practiceQuestions.length - 1" @retry="retryQuestion" @next="nextQuestion"
      />

    </div>

  </div>
</template>

