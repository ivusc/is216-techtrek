import process from 'node:process';
import { expect, test } from '@playwright/test';

const PHONE = { width: 393, height: 851 };
const TABLET = { width: 768, height: 1024 };
const PASSWORD = 'Password1!';

test.describe('login banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/me', (route) =>
      route.fulfill({ json: { isAuthenticated: false, user: null } }),
    );
  });

  test('shows from md up and hides below it', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/login');
    await expect(page.locator('#banner')).toBeVisible();

    await page.setViewportSize(PHONE);
    await expect(page.locator('#banner')).toBeHidden();
  });
});

test.describe('app shell', () => {
  const userName = `shell.${Date.now()}@smu.edu.sg`;

  test.skip(!process.env.API_URL, 'needs a running API, set API_URL');

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${process.env.API_URL}/register`, {
      data: { userName, password: PASSWORD },
    });
    expect(response.status()).toBe(201);
  });

  test.afterAll(async ({ request }) => {
    await request.post(`${process.env.API_URL}/login`, { data: { userName, password: PASSWORD } });
    await request.delete(`${process.env.API_URL}/me`, { data: { password: PASSWORD } });
  });

  test('switches between the sidebar and the tab bar at md', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]:visible').fill(userName);
    await page.locator('input[type="password"]:visible').fill(PASSWORD);
    await page.locator('button[type="submit"]:visible').click();
    await page.waitForURL('**/home');

    await page.setViewportSize(TABLET);
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();

    await page.setViewportSize(PHONE);
    await expect(page.locator('#sidebar')).toBeHidden();
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });
});
