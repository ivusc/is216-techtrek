<script setup>
import { computed, onMounted, ref } from 'vue';
import './interview.css';
import serverAPI from '@/services/serverAPI';
import PageHeader from '@/components/PageHeader.vue';
import TrekLoader from '@/components/TrekLoader.vue';
import SeniorTips from '@/components/interviews/SeniorTips.vue';

const search = ref('');
const difficulties = ['Easy', 'Medium', 'Hard'];
const questionTypes = ['Behavioural', 'Technical', 'System Design', 'Case'];
const selectedTitle = ref('');
const selectedDifficulty = ref('');
const selectedTypes = ref([]);
const averageScore = ref(0);
const highestScore = ref(0);
const applicationCards = ref([]);
const titles = ref([]);
const questions = ref([]);
const seniorTips = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

const loadData = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await serverAPI.get('/interview/dashboard');
    applicationCards.value = response.data.applicationCards;
    titles.value = response.data.titles;
    questions.value = response.data.allQuestions;
    averageScore.value = response.data.averageScore;
    highestScore.value = response.data.highestScore;
    seniorTips.value = response.data.seniorTips;
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Failed to load interview dashboard.';
  }
  isLoading.value = false;
};

onMounted(loadData);

const filteredQuestions = computed(() => {
  return questions.value.filter(
    (q) =>
      (search.value === '' ||
        q.question.toLowerCase().includes(search.value.toLowerCase()) ||
        q.title.toLowerCase().includes(search.value.toLowerCase())) &&
      (selectedTitle.value === '' || q.title === selectedTitle.value) &&
      (selectedTypes.value.length === 0 || selectedTypes.value.includes(q.type)) &&
      (selectedDifficulty.value === '' || q.difficulty === selectedDifficulty.value),
  );
});

const visibleTips = computed(() => {
  const keyword = search.value.toLowerCase();
  return seniorTips.value.filter(
    (tip) =>
      (selectedTitle.value === '' ||
        tip.title.toLowerCase() === selectedTitle.value.toLowerCase()) &&
      (keyword === '' ||
        [tip.organisation, tip.title, tip.tips].some((text) =>
          text.toLowerCase().includes(keyword),
        )),
  );
});

const isEmpty = computed(() => applicationCards.value.length === 0 && questions.value.length === 0);

const hasFilters = computed(
  () =>
    selectedTitle.value !== '' || selectedDifficulty.value !== '' || selectedTypes.value.length > 0,
);

const bankCaption = computed(() => {
  const count = filteredQuestions.value.length;
  return [
    selectedTitle.value,
    selectedTypes.value.join(' + '),
    selectedDifficulty.value,
    `${count} ${count === 1 ? 'question' : 'questions'}`,
  ]
    .filter(Boolean)
    .join(' · ');
});

const stats = computed(() => [
  {
    label: 'Average score',
    value: averageScore.value,
    icon: 'bi-graph-up-arrow',
    tile: 'bg-info-subtle text-primary',
  },
  {
    label: 'Highest score',
    value: highestScore.value,
    icon: 'bi-trophy',
    tile: 'bg-tt-peach text-tt-accent',
  },
  {
    label: 'Questions answered',
    value: questions.value.length,
    icon: 'bi-check2-circle',
    tile: 'bg-primary-subtle text-primary',
  },
]);

function clearFilters() {
  selectedTitle.value = '';
  selectedDifficulty.value = '';
  selectedTypes.value = [];
}

function shortDate(value) {
  return new Date(value).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

</script>

<template>
  <div class="interview-page">
    <PageHeader
      v-model="search"
      title="Interview prep"
      subtitle="Practise by role and question type. Gemini gives instant feedback on every answer."
      type="questions"
    />
    <div
      v-if="errorMessage"
      class="alert alert-danger d-flex justify-content-between align-items-center py-2"
      role="alert"
    >
      {{ errorMessage }}
      <button
        type="button"
        class="btn btn-sm btn-link text-tt-accent fw-semibold"
        @click="loadData"
      >
        Retry
      </button>
    </div>
    <TrekLoader
      v-if="isLoading"
      title="Getting interview prep ready"
      :captions="[
        'Loading your question bank…',
        'Adding up your scores…',
        'Finding roles you can practise for…',
      ]"
    />
    <section
      v-else-if="!errorMessage && isEmpty"
      class="card interview-card interview-empty p-4 p-md-5"
      aria-labelledby="interview-empty-title"
    >
      <span
        class="interview-icon rounded-3 bg-tt-peach text-tt-accent d-flex align-items-center justify-content-center mb-3"
      >
        <i class="bi bi-chat-left-text" aria-hidden="true"></i>
      </span>
      <h2 id="interview-empty-title" class="h3 mb-2">Nothing to practise for yet</h2>
      <p class="text-body-secondary mb-3">
        Practice sessions are written for the jobs and internships you have applied to. Move one to
        Applied or Interview in the tracker and it shows up here, ready for a 5-question session.
      </p>
      <ul class="list-unstyled d-flex flex-column gap-2 mb-4">
        <li class="d-flex gap-2">
          <i class="bi bi-stars text-primary" aria-hidden="true"></i>
          Gemini writes questions for that role and company.
        </li>
        <li class="d-flex gap-2">
          <i class="bi bi-bar-chart text-primary" aria-hidden="true"></i>
          Every answer is scored on structure, clarity, relevance and impact.
        </li>
        <li class="d-flex gap-2">
          <i class="bi bi-collection text-primary" aria-hidden="true"></i>
          Answered questions stay in your question bank with your best score.
        </li>
      </ul>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink to="/tracker" class="btn btn-primary fw-semibold">Open tracker</RouterLink>
        <RouterLink to="/opportunities" class="btn btn-outline-primary fw-semibold">
          Browse opportunities
        </RouterLink>
      </div>
    </section>
    <div v-else-if="!errorMessage" class="row g-4 align-items-start">
      <div class="col-12 col-xl-3">
        <div class="card interview-card p-4 d-flex flex-column gap-3">
          <div class="d-flex align-items-center justify-content-between">
            <h2 class="h4 mb-0">Filters</h2>
            <button
              v-if="hasFilters"
              type="button"
              class="btn btn-link btn-sm p-0 fw-semibold"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>
          <fieldset v-if="titles.length">
            <legend class="text-overline text-uppercase text-body-tertiary mb-2">Role</legend>
            <div class="d-flex flex-wrap flex-xl-column column-gap-4 row-gap-2">
              <div v-for="(title, index) in titles" :key="title" class="form-check mb-0">
                <input
                  :id="`interview-role-${index}`"
                  v-model="selectedTitle"
                  class="form-check-input"
                  type="radio"
                  name="interview-role"
                  :value="title"
                />
                <label class="form-check-label fw-normal" :for="`interview-role-${index}`">
                  {{ title }}
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend class="text-overline text-uppercase text-body-tertiary mb-2">
              Question type
            </legend>
            <div class="d-flex flex-wrap flex-xl-column column-gap-4 row-gap-2">
              <div v-for="(type, index) in questionTypes" :key="type" class="form-check mb-0">
                <input
                  :id="`interview-type-${index}`"
                  v-model="selectedTypes"
                  class="form-check-input"
                  type="checkbox"
                  :value="type"
                />
                <label class="form-check-label fw-normal" :for="`interview-type-${index}`">
                  {{ type }}
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend class="text-overline text-uppercase text-body-tertiary mb-2">Difficulty</legend>
            <div class="d-flex flex-wrap flex-xl-column column-gap-4 row-gap-2">
              <div
                v-for="(difficulty, index) in difficulties"
                :key="difficulty"
                class="form-check mb-0"
              >
                <input
                  :id="`interview-difficulty-${index}`"
                  v-model="selectedDifficulty"
                  class="form-check-input"
                  type="radio"
                  name="interview-difficulty"
                  :value="difficulty"
                />
                <label class="form-check-label fw-normal" :for="`interview-difficulty-${index}`">
                  {{ difficulty }}
                </label>
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      <div class="col-12 col-xl-9 d-flex flex-column gap-4">
        <div v-if="applicationCards.length" class="row g-3">
          <div
            v-for="application in applicationCards"
            :key="application.applicationId"
            class="col-12 col-md-6"
          >
            <article
              class="card interview-card h-100 bg-primary text-white border-0 p-4 d-flex flex-column gap-2"
            >
              <p class="text-overline text-uppercase mb-0">
                {{
                  application.interviewAt
                    ? `Interview · ${shortDate(application.interviewAt)}`
                    : `Applied · ${shortDate(application.createdAt)}`
                }}
              </p>
              <h2 class="h4 text-white mb-0">{{ application.title }}</h2>
              <p class="small mb-2">{{ application.company }}</p>
              <RouterLink
                class="btn btn-light fw-semibold mt-auto align-self-start"
                :to="`/practice/${application.applicationId}`"
              >
                <i class="bi bi-arrow-right me-2" aria-hidden="true"></i>Start 5-question session
              </RouterLink>
            </article>
          </div>
        </div>

        <div class="row g-3">
          <div v-for="stat in stats" :key="stat.label" class="col-12 col-sm-4">
            <div
              class="card interview-card interview-stat h-100 p-3 d-flex flex-row align-items-center gap-3"
            >
              <span
                class="interview-icon rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                :class="stat.tile"
              >
                <i :class="`bi ${stat.icon}`" aria-hidden="true"></i>
              </span>
              <div>
                <div class="h3 mb-0">{{ stat.value }}</div>
                <div class="small text-body-secondary">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>

        <SeniorTips
          v-if="applicationCards.length"
          :tips="visibleTips"
          :filtered="seniorTips.length > 0"
        />

        <section aria-labelledby="interview-bank-title">
          <h2 id="interview-bank-title" class="h3 mb-1">Question bank</h2>
          <p class="small text-body-secondary mb-3">{{ bankCaption }}</p>
          <div class="card interview-card">
            <p v-if="questions.length === 0" class="text-body-secondary mb-0 p-4">
              No questions yet. Start a session and every question you answer is saved here with
              your best score.
            </p>
            <p v-else-if="filteredQuestions.length === 0" class="text-body-secondary mb-0 p-4">
              No questions match these filters.
            </p>
            <ul v-else class="list-group list-group-flush">
              <li
                v-for="question in filteredQuestions"
                :key="question.questionId"
                class="list-group-item bg-transparent d-flex flex-wrap align-items-center column-gap-3 row-gap-2 px-3 px-md-4 py-3"
              >
                <div class="interview-question">
                  <p class="fw-medium mb-1">{{ question.question }}</p>
                  <div class="d-flex flex-wrap align-items-center gap-2 small text-body-secondary">
                    <span class="badge rounded-pill bg-info-subtle text-primary fw-medium">
                      {{ question.type }}
                    </span>
                    <span>{{ question.title }} · {{ question.difficulty }}</span>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-2 ms-auto">
                  <span
                    class="badge rounded-pill fw-medium"
                    :class="
                      question.bestScore < 5
                        ? 'bg-danger-subtle text-tt-accent'
                        : 'bg-info-subtle text-primary'
                    "
                  >
                    {{ question.bestScore }} / 10
                  </span>
                  <RouterLink
                    class="btn btn-light btn-sm fw-semibold"
                    :to="`/practice/question/${question.applicationId}/${question.questionId}`"
                  >
                    Retry
                  </RouterLink>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
