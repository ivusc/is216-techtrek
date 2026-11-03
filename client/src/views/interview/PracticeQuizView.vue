<script setup>
const route = useRoute()
import { ref, onMounted } from 'vue'
import serverAPI from '@/services/serverAPI'
import { useRoute } from 'vue-router'
import FeedbackCard from '@/components/interviews/FeedbackCard.vue'
import QuestionCard from '@/components/interviews/QuestionCard.vue'
import TrekLoader from '@/components/TrekLoader.vue'
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
    try {
      const response = await serverAPI.get(
        `/interview/question/${applicationId}/${questionId}`
      )
      practiceQuestions.value = [response.data]
    } catch (error) {
      console.log(error)
      errorMessage.value = 'Unable to retrieve this question right now. Please try again later'
    }
  }
  else if (applicationId) {
    try {
      errorMessage.value = ''
      const response = await serverAPI.post(
        '/interview/questions',
        {
          applicationId
        }
      )
      practiceQuestions.value = response.data.questions
    } catch (error) {
      console.error(error)
      errorMessage.value =
        'Unable to generate interview questions right now. The AI service may be experiencing high demand.Please try again later.'
    }
  }
}

async function submitAnswer() {
  feedbackLoading.value = true
  submitted.value = true
  errorMessage.value = ''
  try {
    const response = await serverAPI.post(
      '/interview/feedback',
      {
        applicationId,
        question: practiceQuestions.value[currentQuestionIndex.value].question,
        answer: answer.value
      }
    )
    feedback.value = response.data.feedback
    feedbackLoading.value = false
    completedQuestions.value.push({
      questionId: practiceQuestions.value[currentQuestionIndex.value].questionId,
      question: practiceQuestions.value[currentQuestionIndex.value].question,
      type: practiceQuestions.value[currentQuestionIndex.value].type,
      difficulty: practiceQuestions.value[currentQuestionIndex.value].difficulty,
      score: feedback.value.score
    })
  } catch (error) {
    console.error(error)
    feedbackLoading.value = false
    submitted.value = false
    errorMessage.value = "AI was unable to generate feedback because it may currently be experiencing high demand.Please try again later"
  }

  if (currentQuestionIndex.value === practiceQuestions.value.length - 1 && completedQuestions.value.length != 0) {
    await serverAPI.post('/interview/attempt', {
      applicationId,
      questions: completedQuestions.value
    })
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
  <div v-if="errorMessage" class="error-message">
    {{ errorMessage }}
  </div>
  <TrekLoader
    v-if="practiceQuestions.length === 0 && !errorMessage"
    title="Writing your interview questions"
    :captions="['Reading the job description…', 'Asking Gemini for 5 fresh questions…', 'Mixing technical and behavioural…', 'This can take a few seconds…']"
  />
  <div v-if="practiceQuestions.length > 0">
    <div class="progress-bar-container">
      <div class="progress-bar" :style="{ width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%` }">
      </div>
    </div>
    <p class="practice-info">
      Question {{ currentQuestionIndex + 1 }} of {{ practiceQuestions.length }}
    </p>

    <div class="practice-layout">
      <div class="question-container">
        <QuestionCard :question="practiceQuestions[currentQuestionIndex]" />
        <textarea v-model="answer" class="answer-box" placeholder="Type your answer here..." />

        <div class="submit">
          <button class="submit-btn" @click="submitAnswer" :disabled="submitted">
            {{ submitted ? 'Answer Submitted' : 'Submit for Feedback' }}
          </button>
        </div>
      </div>
      <TrekLoader
        v-if="feedbackLoading"
        compact
        title="Grading your answer"
        :captions="['Checking structure and clarity…', 'Looking for impact…', 'Writing a stronger sample answer…']"
      />
      <FeedbackCard v-else-if="feedback" :feedback="feedback"
        :isLastQuestion="currentQuestionIndex === practiceQuestions.length - 1" @next="nextQuestion" />

    </div>
  </div>

</template>
