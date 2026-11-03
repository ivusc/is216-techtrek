import process from 'node:process';
import { expect, test } from '@playwright/test';

const PASSWORD = 'Password1!';
const WIDTHS = [320, 375, 576, 768, 992, 1200, 1440];

test.describe('suggested teammates', () => {
  const stamp = Date.now();
  const leader = `suggest.leader.${stamp}@smu.edu.sg`;
  const candidate = `suggest.candidate.${stamp}@smu.edu.sg`;
  const teamName = `Suggest ${stamp}`;

  test.skip(!process.env.API_URL, 'needs a running API, set API_URL');

  async function registered(playwright, userName) {
    const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
    const response = await api.post('/register', { data: { userName, password: PASSWORD } });
    expect(response.status()).toBe(201);
    return api;
  }

  test.beforeAll(async ({ playwright }) => {
    const candidateApi = await registered(playwright, candidate);
    await candidateApi.patch('/me', {
      data: { skills: ['Vue.js', 'Figma'], year: 2, course: 'Information Systems' },
    });
    await candidateApi.dispose();

    const leaderApi = await registered(playwright, leader);
    await leaderApi.post('/teams', {
      data: {
        name: teamName,
        eventName: 'Hack&Roll',
        teamSize: 4,
        openSlots: 2,
        pitch: 'Ship it',
        skills: ['Vue.js', 'Figma'],
      },
    });
    await leaderApi.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    for (const userName of [leader, candidate]) {
      const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
      await api.post('/login', { data: { userName, password: PASSWORD } });
      await api.delete('/me', { data: { password: PASSWORD } });
      await api.dispose();
    }
  });

  for (const width of WIDTHS) {
    test(`${width} shows the leader who matches their team`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName: leader, password: PASSWORD },
      });
      await page.goto('/teams');
      await page.getByRole('button', { name: /My teams/ }).click();

      const card = page.locator('.card', { hasText: teamName });
      await card.getByRole('button', { name: /match(es)? your team/ }).click();
      await expect(card.getByText('Suggest Candidate', { exact: false })).toBeVisible();
      await card.screenshot({ path: `e2e/__screenshots__/teams/suggestions-${width}.png` });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
});
