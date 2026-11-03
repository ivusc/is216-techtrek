import process from 'node:process';
import { expect, test } from '@playwright/test';

const LG = 992;
const PASSWORD = 'Password1!';
const WIDTHS = [320, 375, 576, 768, 992, 1200, 1440];

test.describe('profile page', () => {
  const userName = `profile.${Date.now()}@smu.edu.sg`;

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

  for (const width of WIDTHS) {
    test(`${width} lays out the profile and keeps unsaved changes in reach`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName, password: PASSWORD },
      });
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
      await page.screenshot({ path: `e2e/__screenshots__/profile/profile-${width}.png` });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      const identity = await page.locator('.identity-card').boundingBox();
      const about = await page.locator('.card', { hasText: 'About' }).first().boundingBox();
      expect(about.x > identity.x + identity.width).toBe(width >= LG);

      await page.getByRole('switch', { name: 'Show me in Teammate Finder' }).click();
      const saveBar = page.getByRole('region', { name: 'Unsaved profile changes' });
      await saveBar.scrollIntoViewIfNeeded();
      await expect(saveBar).toBeInViewport();

      const bar = await saveBar.boundingBox();
      const tabBar = await page.locator('.bottom-nav').boundingBox();
      expect(bar.y + bar.height).toBeLessThanOrEqual(tabBar?.y ?? 900);

      await page.locator('main').evaluate((main) => main.scrollTo(0, main.scrollHeight));
      const lastButton = await page.locator('.profile-page button:visible').last().boundingBox();
      const barAfterScroll = await saveBar.boundingBox();
      const overlaps =
        lastButton.y < barAfterScroll.y + barAfterScroll.height &&
        barAfterScroll.y < lastButton.y + lastButton.height;
      expect(overlaps).toBe(false);
    });
  }
});
