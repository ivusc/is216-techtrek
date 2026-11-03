import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import serverAPI from '@/services/serverAPI';
import InterviewView from '@/views/interview/InterviewView.vue';

process.env.TZ = 'Asia/Singapore';

const mock = new MockAdapter(serverAPI);

const DASHBOARD = {
  applicationCards: [
    {
      applicationId: 'a1',
      title: 'Frontend Intern',
      company: 'Acme',
      createdAt: '2026-10-20T02:00:00.000Z',
      interviewAt: '2026-11-10T06:00:00.000Z',
      status: 'interview',
    },
    {
      applicationId: 'a2',
      title: 'Data Analyst',
      company: 'Lion City Analytics',
      createdAt: '2026-10-22T02:00:00.000Z',
      status: 'applied',
    },
  ],
  titles: ['Frontend Intern', 'Data Analyst'],
  allQuestions: [
    {
      questionId: 1,
      question: 'Tell me about a trade-off you explained.',
      type: 'Behavioural',
      difficulty: 'Medium',
      score: 8,
      applicationId: 'a1',
      title: 'Frontend Intern',
    },
    {
      questionId: 2,
      question: 'How would you keep search responsive?',
      type: 'Technical',
      difficulty: 'Hard',
      score: 4,
      applicationId: 'a1',
      title: 'Frontend Intern',
    },
    {
      questionId: 3,
      question: 'How would you clean messy dates?',
      type: 'Case',
      difficulty: 'Easy',
      score: 9,
      applicationId: 'a2',
      title: 'Data Analyst',
    },
  ],
  questionScores: { 1: { highScore: 8 }, 2: { highScore: 4 }, 3: { highScore: 9 } },
  highestScore: 9,
  averageScore: '7.0',
  interviewAttempts: [],
};

beforeEach(() => setActivePinia(createPinia()));

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

async function mountDashboard() {
  const wrapper = mount(InterviewView, { global: { stubs: { RouterLink: RouterLinkStub } } });
  await flushPromises();
  return wrapper;
}

describe('InterviewView', () => {
  it('shows a failed load as an alert with a retry that clears it as soon as the retry starts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let finishRetry;
    mock
      .onGet('/interview/dashboard')
      .replyOnce(500, { error: 'Failed to load interview dashboard' })
      .onGet('/interview/dashboard')
      .reply(() => new Promise((resolve) => (finishRetry = () => resolve([200, DASHBOARD]))));
    const wrapper = await mountDashboard();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain('Failed to load interview dashboard.');
    expect(wrapper.find('#interview-empty-title').exists()).toBe(false);
    expect(wrapper.find('#interview-bank-title').exists()).toBe(false);

    await alert.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Getting interview prep ready');

    finishRetry();
    await flushPromises();

    expect(mock.history.get).toHaveLength(2);
    expect(wrapper.get('#interview-bank-title').text()).toBe('Question bank');
  });
});
