import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import PracticeQuizView from '@/views/interview/PracticeQuizView.vue';

const routing = vi.hoisted(() => ({ params: {} }));

vi.mock('vue-router', async () => {
  const { RouterLinkStub } = await import('@vue/test-utils');
  return { useRoute: () => ({ params: routing.params }), RouterLink: RouterLinkStub };
});

const mock = new MockAdapter(serverAPI);

const QUESTIONS = [
  { questionId: 11, question: 'Why Acme?', type: 'Behavioural', difficulty: 'Easy' },
  { questionId: 12, question: 'Computed or watch?', type: 'Technical', difficulty: 'Medium' },
  { questionId: 13, question: 'An accessibility win?', type: 'Behavioural', difficulty: 'Medium' },
  { questionId: 14, question: 'Kanban state?', type: 'System Design', difficulty: 'Hard' },
  { questionId: 15, question: 'A blank page?', type: 'Case', difficulty: 'Hard' },
];

const SAVED_QUESTION = {
  questionId: 7,
  question: 'Tell me about a trade-off you explained.',
  type: 'Behavioural',
  difficulty: 'Medium',
  score: 6,
};

const FEEDBACK = {
  score: 7,
  summary: 'Clear, needs a result.',
  overallFeedback: 'Good structure.',
  structure: 8,
  clarity: 7,
  relevance: 8,
  impact: 5,
  strengths: ['Clear situation', 'Specific actions'],
  improvements: ['Quantify the result', 'Link it to the role'],
  sampleAnswer: 'I rebuilt the search page.',
};

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

function mountPractice(params) {
  routing.params = params;
  return mount(PracticeQuizView);
}

function submitButton(wrapper) {
  return wrapper.get('.submit-btn');
}

function posts(url) {
  return mock.history.post.filter((config) => config.url === url);
}

describe('PracticeQuizView', () => {
  it('shows an error when saving the attempt fails and lets the answer be sent again', async () => {
    mock.onGet('/interview/question/a1/7').reply(200, SAVED_QUESTION);
    mock.onPost('/interview/feedback').reply(200, { feedback: FEEDBACK });
    mock
      .onPost('/interview/attempt')
      .replyOnce(500, { error: 'Failed to save interview attempt' })
      .onPost('/interview/attempt')
      .reply(201, {});
    const wrapper = mountPractice({ applicationId: 'a1', questionId: '7' });
    await flushPromises();

    await wrapper.get('textarea').setValue('I drew the trade-off as a diagram.');
    await submitButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'This practice session could not be saved.',
    );
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();

    await submitButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    const saved = posts('/interview/attempt').map((config) => JSON.parse(config.data));
    expect(saved).toHaveLength(2);
    expect(saved[1].questions).toEqual([
      {
        questionId: 7,
        question: SAVED_QUESTION.question,
        type: 'Behavioural',
        difficulty: 'Medium',
        score: 7,
      },
    ]);
  });

  it('does not submit an empty answer', async () => {
    mock.onPost('/interview/questions').reply(200, { questions: QUESTIONS });
    const wrapper = mountPractice({ applicationId: 'a1' });
    await flushPromises();

    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.get('textarea').setValue('   ');
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.get('textarea').setValue('Because I use their robots.');
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined();
  });
});
