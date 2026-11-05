<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { reviewDifficulties, typeBadge } from '@/constants';
import ConfettiBurst from '@/components/tracker/ConfettiBurst.vue';

const props = defineProps({
  application: { type: Object, required: true },
  step: { type: String, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const emit = defineEmits(['close', 'next', 'submit']);

const MAX_ROUNDS = 300;
const MAX_TIPS = 1000;

const opportunity = computed(() => props.application.opportunityId);

// editing: start from the tips already shared
const existing = props.application.review;
const editing = Boolean(existing);
const form = reactive({
  difficulty: existing?.difficulty ?? 3,
  rounds: existing?.rounds ?? '',
  tips: existing?.tips ?? '',
});

const difficultyLabel = computed(
  () => reviewDifficulties.find((option) => option.value === form.difficulty).label,
);

function submit() {
  emit('submit', {
    difficulty: form.difficulty,
    rounds: form.rounds.trim(),
    tips: form.tips.trim(),
  });
}

const dialog = ref(null);
onMounted(() => dialog.value.focus());
</script>

<template>
  <div class="modal-backdrop fade show"></div>

  <!-- the offer is in: confetti pops out from both corners -->
  <ConfettiBurst v-if="step === 'congrats'" />

  <div
    ref="dialog"
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="offer-modal-title"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable application-modal">
      <form class="modal-content" novalidate @submit.prevent="submit">
        <div class="modal-header gap-3">
          <div
            v-if="step === 'congrats'"
            class="modal-logo h4 mb-0 d-flex justify-content-center align-items-center bg-tt-peach text-tt-accent"
          >
            <i class="bi bi-trophy" aria-hidden="true"></i>
          </div>
          <div
            v-else
            class="modal-logo h4 mb-0 d-flex justify-content-center align-items-center"
            :class="typeBadge[opportunity.type]"
          >
            {{ opportunity.organisation.slice(0, 2).toUpperCase() }}
          </div>
          <div class="flex-grow-1">
            <h2 id="offer-modal-title" class="mb-0">
              {{
                step === 'congrats'
                  ? `Congratulations on your offer from ${opportunity.organisation}!`
                  : editing
                    ? 'Edit your interview tips'
                    : 'Share your interview tips'
              }}
            </h2>
            <span class="small text-body-secondary">
              {{ opportunity.title }} · {{ opportunity.organisation }}
            </span>
          </div>
          <button
            class="btn modal-close-button text-body-secondary"
            type="button"
            aria-label="Close"
            @click="$emit('close')"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div v-if="step === 'congrats'" class="modal-body d-flex flex-column">
          <p class="mb-0">
            You made it through the process for {{ opportunity.title }}. Pass it on: tell the next
            SMU student what the rounds were like and what helped you.
          </p>
          <div
            class="d-flex align-items-center gap-2 rounded-3 bg-primary-subtle px-3 py-2 small text-body-secondary"
          >
            <i class="bi bi-incognito" aria-hidden="true"></i>
            <span>
              Your tips are posted anonymously, for students preparing for this role at
              {{ opportunity.organisation }}.
            </span>
          </div>
        </div>

        <div v-else class="modal-body d-flex flex-column">
          <div v-if="error" class="alert alert-danger py-2 mb-0" role="alert">{{ error }}</div>

          <div>
            <span id="offer-difficulty-label" class="form-label d-block small fw-semibold mb-1">
              How hard was the process?
            </span>
            <div
              class="btn-group w-100"
              role="radiogroup"
              aria-labelledby="offer-difficulty-label"
              aria-describedby="offer-difficulty-hint"
            >
              <template v-for="option in reviewDifficulties" :key="option.value">
                <input
                  :id="`offer-difficulty-${option.value}`"
                  v-model="form.difficulty"
                  class="btn-check"
                  type="radio"
                  name="offer-difficulty"
                  :value="option.value"
                />
                <label
                  class="btn btn-outline-primary fw-semibold"
                  :for="`offer-difficulty-${option.value}`"
                >
                  {{ option.value }}<span class="visually-hidden"> · {{ option.label }}</span>
                </label>
              </template>
            </div>
            <p id="offer-difficulty-hint" class="text-caption text-body-tertiary mt-1 mb-0">
              {{ form.difficulty }} of 5 · {{ difficultyLabel }}
            </p>
          </div>

          <div>
            <label for="offer-rounds" class="form-label small fw-semibold mb-1">
              What were the rounds?
            </label>
            <input
              id="offer-rounds"
              v-model="form.rounds"
              type="text"
              class="form-control field-lg"
              :maxlength="MAX_ROUNDS"
              placeholder="e.g. Online assessment → technical interview → hiring manager chat"
            />
          </div>

          <div>
            <label for="offer-tips" class="form-label small fw-semibold mb-1">Your tips *</label>
            <div class="notes-field">
              <textarea
                id="offer-tips"
                v-model="form.tips"
                class="form-control border-0 shadow-none p-0"
                rows="4"
                :maxlength="MAX_TIPS"
                required
                placeholder="What they asked, what helped you prepare, what you would do differently…"
              ></textarea>
              <span class="text-caption text-body-tertiary text-end">
                {{ form.tips.length }} / {{ MAX_TIPS }}
              </span>
            </div>
          </div>

          <p class="text-caption text-body-tertiary mb-0">
            <i class="bi bi-incognito" aria-hidden="true"></i>
            Posted as "An SMU senior". Students who applied for {{ opportunity.title }} at
            {{ opportunity.organisation }} see it in Interview Prep.
          </p>
        </div>

        <div
          v-if="step === 'congrats'"
          class="modal-footer bg-body-secondary flex-column-reverse flex-sm-row align-items-stretch align-items-sm-center"
        >
          <button
            class="btn btn-link fw-semibold text-decoration-none me-sm-auto"
            type="button"
            @click="$emit('close')"
          >
            Maybe later
          </button>
          <button
            class="btn btn-tt-accent fw-semibold btn-cta"
            type="button"
            @click="$emit('next')"
          >
            Share your interview tips
          </button>
        </div>

        <div v-else class="modal-footer bg-body-secondary">
          <button
            class="btn btn-outline-primary fw-semibold btn-cta"
            type="button"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary fw-semibold btn-cta"
            type="submit"
            :disabled="busy || form.tips.trim() === ''"
          >
            <template v-if="editing">{{ busy ? 'Saving…' : 'Save changes' }}</template>
            <template v-else>{{ busy ? 'Sharing…' : 'Share tips' }}</template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
