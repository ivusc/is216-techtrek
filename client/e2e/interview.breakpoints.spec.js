import process from 'node:process';
import { expect, test } from '@playwright/test';

const LG = 992;
const XL = 1200;
const PASSWORD = 'Password1!';
const WIDTHS = [320, 375, 576, 768, 992, 1200, 1440];

const FEEDBACK = {
  score: 7,
  summary: 'Clear structure',
  overallFeedback: 'Quantify the result to make the impact land.',
  structure: 9,
  clarity: 8,
  relevance: 7,
  impact: 5,
  strengths: ['Clear STAR structure.', 'Specific about your own actions.'],
  improvements: ['Give a measurable result.', 'Shorten the background.'],
  sampleAnswer: 'In my second year I had two weeks to learn Vue for a hackathon.',
};

const QUESTIONS = [
  ['Tell me about a time you learned a new framework quickly.', 'Behavioural', 'Easy', 8],
  ['How would you keep a 10,000 row list in Vue scrolling smoothly?', 'Technical', 'Medium', 6],
  ['Design the notification system for a campus events app.', 'System Design', 'Hard', 4],
];

function listing(externalId, title, organisation) {
  return {
    source: 'adzuna',
    externalId,
    type: 'internship',
    title,
    organisation,
    location: 'Singapore',
    url: `https://example.com/${externalId}`,
  };
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main.scrollWidth - main.clientWidth,
    );
  });
}

async function expectInsideMain(page, locator) {
  const main = await page.locator('main').boundingBox();
  for (const box of await locator.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  )) {
    expect(box.left).toBeGreaterThanOrEqual(main.x);
    expect(box.right).toBeLessThanOrEqual(main.x + main.width);
  }
}

test.describe('interview prep page', () => {
  const stamp = Date.now();
  const newcomer = `interview.newcomer.${stamp}@smu.edu.sg`;
  const applicant = `interview.applicant.${stamp}@smu.edu.sg`;
  const firstQuestionId = (stamp % 1e6) * 10;
  let appliedId;

  test.skip(!process.env.API_URL, 'needs a running API, set API_URL');

  async function registered(playwright, userName) {
    const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
    const response = await api.post('/register', { data: { userName, password: PASSWORD } });
    expect(response.status()).toBe(201);
    await api.patch('/me', { data: { onboarded: true } });
    return api;
  }

  test.beforeAll(async ({ playwright }) => {
    const newcomerApi = await registered(playwright, newcomer);
    await newcomerApi.post('/application', {
      data: {
        opportunity: listing(`saved-${stamp}`, 'Product Design Intern', 'Carousell'),
        status: 'saved',
      },
    });
    await newcomerApi.dispose();

    const applicantApi = await registered(playwright, applicant);
    const applied = await applicantApi.post('/application', {
      data: {
        opportunity: listing(`fe-${stamp}`, 'Frontend Engineering Intern', 'Shopee'),
        status: 'applied',
      },
    });
    await applicantApi.post('/application', {
      data: {
        opportunity: listing(`da-${stamp}`, 'Data Analyst Intern', 'GovTech'),
        status: 'interview',
        interviewAt: '2026-11-18T02:00:00.000Z',
      },
    });
    appliedId = (await applied.json())._id;
    await applicantApi.post('/interview/attempt', {
      data: {
        applicationId: appliedId,
        questions: QUESTIONS.map(([question, type, difficulty, score], index) => ({
          questionId: firstQuestionId + index,
          question,
          type,
          difficulty,
          score,
        })),
      },
    });
    await applicantApi.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    for (const userName of [newcomer, applicant]) {
      const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
      await api.post('/login', { data: { userName, password: PASSWORD } });
      await api.delete('/me', { data: { password: PASSWORD } });
      await api.dispose();
    }
  });

  for (const width of WIDTHS) {
    test(`${width} explains how to start when nothing is applied for yet`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName: newcomer, password: PASSWORD },
      });
      await page.goto('/interview');

      const tracker = page.getByRole('link', { name: 'Open tracker' });
      await expect(tracker).toBeInViewport();
      await expect(page.getByRole('link', { name: 'Browse opportunities' })).toBeInViewport();
      await page.screenshot({ path: `e2e/__screenshots__/interview/empty-${width}.png` });

      expect(await horizontalOverflow(page)).toBe(0);
    });

    test(`${width} keeps every card, stat and practice link on screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName: applicant, password: PASSWORD },
      });
      await page.goto('/interview');

      await expect(
        page.getByRole('heading', { name: 'Frontend Engineering Intern' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Retry' })).toHaveCount(QUESTIONS.length);
      await page.screenshot({ path: `e2e/__screenshots__/interview/applied-${width}.png` });

      expect(await horizontalOverflow(page)).toBe(0);
      const filters = await page
        .locator('.card', { has: page.getByRole('heading', { name: 'Filters' }) })
        .boundingBox();
      const bank = await page.getByRole('heading', { name: 'Question bank' }).boundingBox();
      expect(bank.x >= filters.x + filters.width).toBe(width >= XL);
      await expectInsideMain(page, page.locator('.interview-stat'));
      await expectInsideMain(page, page.getByRole('link', { name: 'Retry' }));
      await expectInsideMain(page, page.getByRole('link', { name: /Start .*session/ }));
    });

    test(`${width} gives the practice question its full width and stacks feedback below lg`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName: applicant, password: PASSWORD },
      });
      await page.route('**/interview/feedback', (route) =>
        route.fulfill({ json: { feedback: FEEDBACK } }),
      );
      await page.goto(`/practice/question/${appliedId}/${firstQuestionId}`);

      const heading = page.getByRole('heading', { name: QUESTIONS[0][0] });
      await expect(heading).toBeVisible();
      const card = await page.locator('.question-card').boundingBox();
      const text = await heading.boundingBox();
      expect(text.width / card.width).toBeGreaterThan(0.75);

      await page.getByPlaceholder('Type your answer here...').fill('I learned Vue in two weeks.');
      await page.getByRole('button', { name: 'Submit for Feedback' }).click();
      await expect(page.getByRole('heading', { name: 'AI feedback' })).toBeVisible();
      await page.screenshot({ path: `e2e/__screenshots__/interview/practice-${width}.png` });

      expect(await horizontalOverflow(page)).toBe(0);
      await expectInsideMain(page, page.locator('.feedback-card'));
      const feedback = await page.locator('.feedback-card').boundingBox();
      expect(feedback.x >= card.x + card.width).toBe(width >= LG);
    });
  }
});
