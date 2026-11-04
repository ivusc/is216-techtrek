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
      applicationId: 'a1',
      title: 'Frontend Intern',
      bestScore: 8,
    },
    {
      questionId: 2,
      question: 'How would you keep search responsive?',
      type: 'Technical',
      difficulty: 'Hard',
      applicationId: 'a1',
      title: 'Frontend Intern',
      bestScore: 4,
    },
    {
      questionId: 3,
      question: 'How would you clean messy dates?',
      type: 'Case',
      difficulty: 'Easy',
      applicationId: 'a2',
      title: 'Data Analyst',
      bestScore: 9,
    },
  ],
  highestScore: 9,
  averageScore: '7.0',
  seniorTips: [
    {
      organisation: 'Acme',
      title: 'Frontend Intern',
      difficulty: 3,
      rounds: 'Take-home, then a pairing session',
      tips: 'Walk through a component you built and why.',
      createdAt: '2026-10-30T02:00:00.000Z',
    },
    {
      organisation: 'Lion City Analytics',
      title: 'Data Analyst',
      difficulty: 4,
      tips: 'Practise SQL window functions.',
      createdAt: '2026-10-28T02:00:00.000Z',
    },
  ],
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

function rows(wrapper) {
  return wrapper.get('[aria-labelledby="interview-bank-title"]').findAll('.list-group-item');
}

function tipRoles(wrapper) {
  return wrapper
    .get('[aria-labelledby="senior-tips-title"]')
    .findAll('li h3')
    .map((role) => role.text());
}

function rowQuestions(wrapper) {
  return rows(wrapper).map((row) => row.get('.interview-question p').text());
}

function filterInput(wrapper, label) {
  const target = wrapper.findAll('label').find((candidate) => candidate.text() === label);
  return wrapper.get(`#${target.attributes('for')}`);
}

function clearButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === 'Clear');
}

function caption(wrapper) {
  return wrapper.get('#interview-bank-title + p').text();
}

describe('InterviewView', () => {
  it('shows the role cards, the stats and a row per question', async () => {
    mock.onGet('/interview/dashboard').reply(200, DASHBOARD);
    const wrapper = await mountDashboard();

    const cards = wrapper.findAll('article');
    expect(cards.map((card) => card.get('h2').text())).toEqual(['Frontend Intern', 'Data Analyst']);
    expect(cards[0].text()).toContain('Interview · Tue, 10 Nov');
    expect(cards[0].text()).toContain('Acme');
    expect(cards[1].text()).toContain('Applied · Thu, 22 Oct');
    expect(cards[0].getComponent(RouterLinkStub).props('to')).toBe('/practice/a1');
    expect(cards[0].getComponent(RouterLinkStub).text()).toBe('Start 5-question session');

    expect(
      wrapper
        .findAll('.interview-stat')
        .map((stat) => [stat.get('.small').text(), stat.get('.h3').text()]),
    ).toEqual([
      ['Average score', '7.0'],
      ['Highest score', '9'],
      ['Questions answered', '3'],
    ]);

    expect(caption(wrapper)).toBe('3 questions');
    expect(rowQuestions(wrapper)).toEqual(DASHBOARD.allQuestions.map((q) => q.question));
    const [first, second, third] = rows(wrapper);
    expect(first.get('.badge').text()).toBe('Behavioural');
    expect(first.text()).toContain('Frontend Intern · Medium');
    const firstScore = first.findAll('.badge')[1];
    expect(firstScore.text()).toBe('8 / 10');
    expect(firstScore.classes()).toContain('bg-info-subtle');
    expect(second.findAll('.badge')[1].classes()).toContain('bg-danger-subtle');
    expect(third.getComponent(RouterLinkStub).props('to')).toBe('/practice/question/a2/3');
    expect(third.getComponent(RouterLinkStub).text()).toBe('Retry');
  });

  it('filters the bank by search, role, type and difficulty and clears the filters', async () => {
    mock.onGet('/interview/dashboard').reply(200, DASHBOARD);
    const wrapper = await mountDashboard();

    expect(clearButton(wrapper)).toBeUndefined();
    await wrapper.get('input[aria-label="Search questions"]').setValue('DATES');
    expect(rowQuestions(wrapper)).toEqual(['How would you clean messy dates?']);
    await wrapper.get('input[aria-label="Search questions"]').setValue('');

    await filterInput(wrapper, 'Frontend Intern').setValue(true);
    expect(rowQuestions(wrapper)).toHaveLength(2);
    expect(caption(wrapper)).toBe('Frontend Intern · 2 questions');

    await filterInput(wrapper, 'Technical').setValue(true);
    expect(rowQuestions(wrapper)).toEqual(['How would you keep search responsive?']);
    expect(caption(wrapper)).toBe('Frontend Intern · Technical · 1 question');

    await filterInput(wrapper, 'Easy').setValue(true);
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain('No questions match these filters.');

    await clearButton(wrapper).trigger('click');
    expect(rowQuestions(wrapper)).toHaveLength(3);
    expect(caption(wrapper)).toBe('3 questions');
    expect(clearButton(wrapper)).toBeUndefined();
  });

  it('lists senior tips for the roles and narrows them by role and search', async () => {
    mock.onGet('/interview/dashboard').reply(200, DASHBOARD);
    const wrapper = await mountDashboard();

    expect(tipRoles(wrapper)).toEqual([
      'Acme · Frontend Intern',
      'Lion City Analytics · Data Analyst',
    ]);

    await filterInput(wrapper, 'Frontend Intern').setValue(true);
    expect(tipRoles(wrapper)).toEqual(['Acme · Frontend Intern']);
    await clearButton(wrapper).trigger('click');

    await wrapper.get('input[aria-label="Search questions"]').setValue('sql');
    expect(tipRoles(wrapper)).toEqual(['Lion City Analytics · Data Analyst']);
    await wrapper.get('input[aria-label="Search questions"]').setValue('lion city');
    expect(tipRoles(wrapper)).toEqual(['Lion City Analytics · Data Analyst']);
    await wrapper.get('input[aria-label="Search questions"]').setValue('kubernetes');
    expect(tipRoles(wrapper)).toEqual([]);
    expect(wrapper.get('[aria-labelledby="senior-tips-title"]').text()).toContain(
      'No tips match these filters.',
    );
  });

  it('explains how to start when there is nothing to practise for', async () => {
    mock
      .onGet('/interview/dashboard')
      .reply(200, { ...DASHBOARD, applicationCards: [], titles: [], allQuestions: [] });
    const wrapper = await mountDashboard();

    expect(wrapper.get('#interview-empty-title').text()).toBe('Nothing to practise for yet');
    expect(
      wrapper.findAllComponents(RouterLinkStub).map((link) => [link.text(), link.props('to')]),
    ).toEqual(
      expect.arrayContaining([
        ['Open tracker', '/tracker'],
        ['Browse opportunities', '/opportunities'],
      ]),
    );
    expect(wrapper.find('#interview-bank-title').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Filters');
  });

  it('says the bank is empty before the first session', async () => {
    mock.onGet('/interview/dashboard').reply(200, { ...DASHBOARD, allQuestions: [] });
    const wrapper = await mountDashboard();

    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(caption(wrapper)).toBe('0 questions');
    expect(wrapper.text()).toContain('No questions yet. Start a session');
    expect(wrapper.find('#interview-empty-title').exists()).toBe(false);
  });

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
