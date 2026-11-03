import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils';
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

async function answer(wrapper, text) {
  await wrapper.get('textarea').setValue(text);
  await submitButton(wrapper).trigger('click');
  await flushPromises();
}

function nextButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text().includes('Next Question'));
}

describe('PracticeQuizView', () => {
  it('generates five questions and walks through them', async () => {
    mock.onPost('/interview/questions').reply(200, { questions: QUESTIONS });
    mock.onPost('/interview/feedback').reply(200, { feedback: FEEDBACK });
    const wrapper = mountPractice({ applicationId: 'a1' });

    expect(wrapper.text()).toContain('Writing your interview questions');
    await flushPromises();

    expect(JSON.parse(posts('/interview/questions')[0].data)).toEqual({ applicationId: 'a1' });
    expect(wrapper.text()).toContain('Question 1 of 5');
    expect(wrapper.get('.progress-bar').attributes('style')).toBe('width: 20%;');
    expect(wrapper.get('.question-heading').text()).toBe('Why Acme?');

    await answer(wrapper, 'Because I use their robots.');

    expect(JSON.parse(posts('/interview/feedback')[0].data)).toEqual({
      applicationId: 'a1',
      question: 'Why Acme?',
      answer: 'Because I use their robots.',
    });
    expect(submitButton(wrapper).text()).toBe('Answer Submitted');
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.get('.feedback-card').text()).toContain('Clear, needs a result.');

    await nextButton(wrapper).trigger('click');

    expect(wrapper.text()).toContain('Question 2 of 5');
    expect(wrapper.get('.progress-bar').attributes('style')).toBe('width: 40%;');
    expect(wrapper.get('.question-heading').text()).toBe('Computed or watch?');
    expect(wrapper.get('textarea').element.value).toBe('');
    expect(wrapper.find('.feedback-card').exists()).toBe(false);
    expect(posts('/interview/attempt')).toHaveLength(0);
  });

  it('saves the attempt after the last question', async () => {
    mock.onPost('/interview/questions').reply(200, { questions: QUESTIONS });
    mock.onPost('/interview/feedback').reply((config) => {
      const { question } = JSON.parse(config.data);
      const score = QUESTIONS.findIndex((candidate) => candidate.question === question) + 5;
      return [200, { feedback: { ...FEEDBACK, score } }];
    });
    mock.onPost('/interview/attempt').reply(201, {});
    const wrapper = mountPractice({ applicationId: 'a1' });
    await flushPromises();

    await answer(wrapper, 'Answer 1');
    for (const [index] of QUESTIONS.slice(1).entries()) {
      await nextButton(wrapper).trigger('click');
      await answer(wrapper, `Answer ${index + 2}`);
    }

    expect(nextButton(wrapper)).toBeUndefined();
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/interview');
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe('Back to Applications');
    expect(posts('/interview/attempt')).toHaveLength(1);
    expect(JSON.parse(posts('/interview/attempt')[0].data)).toEqual({
      applicationId: 'a1',
      questions: QUESTIONS.map((question, index) => ({ ...question, score: index + 5 })),
    });
  });

  it('loads one saved question for practice again and saves a one-question attempt', async () => {
    mock.onGet('/interview/question/a1/7').reply(200, SAVED_QUESTION);
    mock.onPost('/interview/feedback').reply(200, { feedback: FEEDBACK });
    mock.onPost('/interview/attempt').reply(201, {});
    const wrapper = mountPractice({ applicationId: 'a1', questionId: '7' });
    await flushPromises();

    expect(posts('/interview/questions')).toHaveLength(0);
    expect(wrapper.text()).toContain('Question 1 of 1');
    expect(wrapper.get('.question-heading').text()).toBe(SAVED_QUESTION.question);

    await answer(wrapper, 'I drew the trade-off as a diagram.');

    expect(JSON.parse(posts('/interview/attempt')[0].data)).toEqual({
      applicationId: 'a1',
      questions: [
        {
          questionId: 7,
          question: SAVED_QUESTION.question,
          type: 'Behavioural',
          difficulty: 'Medium',
          score: 7,
        },
      ],
    });
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe('Back to Applications');
  });

  it.each([
    [
      'a new session',
      { applicationId: 'a1' },
      (adapter) => adapter.onPost('/interview/questions').reply(500),
      'Unable to generate interview questions right now.',
    ],
    [
      'a saved question',
      { applicationId: 'a1', questionId: '7' },
      (adapter) => adapter.onGet('/interview/question/a1/7').reply(404),
      'Unable to retrieve this question right now.',
    ],
  ])('explains when %s cannot be loaded', async (label, params, failure, message) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    failure(mock);
    const wrapper = mountPractice(params);
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain(message);
    expect(wrapper.text()).not.toContain('Writing your interview questions');
    expect(wrapper.find('textarea').exists()).toBe(false);
  });

  it('explains when the AI cannot give feedback and lets the answer be sent again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.onPost('/interview/questions').reply(200, { questions: QUESTIONS });
    mock
      .onPost('/interview/feedback')
      .replyOnce(503)
      .onPost('/interview/feedback')
      .reply(200, { feedback: FEEDBACK });
    const wrapper = mountPractice({ applicationId: 'a1' });
    await flushPromises();

    await answer(wrapper, 'Because I use their robots.');

    expect(wrapper.get('[role="alert"]').text()).toContain('AI was unable to generate feedback');
    expect(wrapper.find('.feedback-card').exists()).toBe(false);
    expect(submitButton(wrapper).text()).toBe('Submit for Feedback');

    await submitButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('.feedback-card').exists()).toBe(true);
  });

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
