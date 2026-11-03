import { WIDTHS, expect, expectNoHorizontalOverflow, screenshot, test } from './fixtures.js';

const LG = 992;

test.describe('profile page', () => {
  for (const width of WIDTHS) {
    test(`${width} lays out the profile and keeps unsaved changes in reach`, async ({
      loggedIn: page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
      await screenshot(page, testInfo, `profile/profile-${width}`);

      await expectNoHorizontalOverflow(page);

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
