import { readFileSync } from 'node:fs';
import process from 'node:process';
import { DESKTOP, PHONE, expect, test } from './fixtures.js';

const INTERVIEW = JSON.parse(
  readFileSync(new URL('./fixtures/interview.json', import.meta.url), 'utf8'),
);
const FIRST_APPLICATION = INTERVIEW.dashboard.applicationCards[0].applicationId;
const SIZES = { phone: PHONE, desktop: DESKTOP };

async function mockInterviewApi(page) {
  const calls = [];
  const replies = {
    'GET dashboard': () => ({ json: INTERVIEW.dashboard }),
    'POST questions': () => ({ json: INTERVIEW.questions }),
    'POST feedback': () => ({ json: INTERVIEW.feedback }),
    'POST attempt': (body) => ({ status: 201, json: { _id: 'attempt-1', ...body } }),
    'GET question': () => ({ json: INTERVIEW.question }),
  };
  await page.route(`${process.env.API_URL}/interview/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const { pathname } = new URL(request.url());
    const reply = replies[`${method} ${pathname.split('/')[2]}`];
    if (!reply) {
      await route.abort();
      throw new Error(`Unmocked ${method} ${pathname}`);
    }
    const body = request.postDataJSON();
    calls.push({ method, pathname, body });
    await route.fulfill(reply(body));
  });
  return calls;
}

function callsTo(calls, pathname) {
  return calls.filter((call) => call.pathname === pathname);
}

async function answerQuestion(page, number, question) {
  await expect(page.getByText(`Question ${number} of 5`)).toBeVisible();
  await expect(page.getByRole('heading', { name: question.question })).toBeVisible();
  await expect(page.locator('.progress-bar')).toHaveAttribute('style', `width: ${number * 20}%;`);

  await page.getByPlaceholder('Type your answer here...').fill(`My answer ${number}`);
  await page.getByRole('button', { name: 'Submit for Feedback' }).click();
  await expect(page.getByRole('button', { name: 'Answer Submitted' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'AI feedback' })).toBeVisible();
}

test.describe('interview flows', () => {
  for (const [device, size] of Object.entries(SIZES)) {
    test(`${device} starts a session, answers five questions and returns to the dashboard`, async ({
      loggedIn: page,
    }) => {
      const calls = await mockInterviewApi(page);
      await page.setViewportSize(size);
      await page.goto('/interview');
      await page.getByRole('link', { name: 'Start 5-question session' }).first().click();
      await page.waitForURL(`**/practice/${FIRST_APPLICATION}`);

      const questions = INTERVIEW.questions.questions;
      await answerQuestion(page, 1, questions[0]);
      for (const [index, question] of questions.slice(1).entries()) {
        await page.getByRole('button', { name: 'Next Question' }).click();
        await answerQuestion(page, index + 2, question);
      }

      await expect(page.getByRole('button', { name: 'Next Question' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Back to Applications' }).click();
      await page.waitForURL((url) => url.pathname === '/interview');
      await expect(page.getByRole('heading', { name: 'Question bank' })).toBeVisible();

      expect(callsTo(calls, '/interview/questions')).toHaveLength(1);
      expect(callsTo(calls, '/interview/feedback').map((call) => call.body.answer)).toEqual(
        questions.map((question, index) => `My answer ${index + 1}`),
      );
      await expect.poll(() => callsTo(calls, '/interview/attempt')).toHaveLength(1);
      const [attempt] = callsTo(calls, '/interview/attempt');
      expect(attempt.body).toEqual({
        applicationId: FIRST_APPLICATION,
        questions: questions.map((question) => ({ ...question, score: 7 })),
      });
    });

    test(`${device} practises a single question again`, async ({ loggedIn: page }) => {
      const calls = await mockInterviewApi(page);
      const saved = INTERVIEW.dashboard.allQuestions[0];
      await page.setViewportSize(size);
      await page.goto('/interview');
      await page.getByRole('link', { name: 'Retry' }).first().click();
      await page.waitForURL(`**/practice/question/${saved.applicationId}/${saved.questionId}`);

      await expect(page.getByText('Question 1 of 1')).toBeVisible();
      await expect(page.getByRole('heading', { name: saved.question })).toBeVisible();
      await page.getByPlaceholder('Type your answer here...').fill('I drew it as a diagram.');
      await page.getByRole('button', { name: 'Submit for Feedback' }).click();
      await expect(page.getByRole('link', { name: 'Back to Applications' })).toBeVisible();

      const questionPath = `/interview/question/${saved.applicationId}/${saved.questionId}`;
      expect(callsTo(calls, questionPath)).toHaveLength(1);
      await expect.poll(() => callsTo(calls, '/interview/attempt')).toHaveLength(1);
      const [attempt] = callsTo(calls, '/interview/attempt');
      expect(attempt.body.questions).toEqual([
        {
          questionId: saved.questionId,
          question: saved.question,
          type: saved.type,
          difficulty: saved.difficulty,
          score: 7,
        },
      ]);
    });
  }
});

test('leaves the Bootstrap progress bar on the Teams page at its own height', async ({
  loggedIn: page,
  account,
}) => {
  const created = await account.api.post('/teams', {
    data: {
      name: 'Progress Check',
      eventName: 'Hack&Roll',
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a demo every weekend.',
    },
  });
  expect(created.status()).toBe(201);
  await page.setViewportSize(DESKTOP);
  await page.goto('/teams');
  await page.locator('main .tab-cards').getByRole('tab', { name: 'Requests' }).click();

  const track = page.getByRole('progressbar');
  await expect(track).toBeVisible();
  const heights = await track.evaluate((element) => ({
    track: element.getBoundingClientRect().height,
    bar: element.querySelector('.progress-bar').getBoundingClientRect().height,
  }));
  expect(heights.bar).toBe(heights.track);
});
