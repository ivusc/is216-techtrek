import { expect, test } from './fixtures.js';

test('768 keeps the calendar grid inside its card', async ({ loggedIn: page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/tracker');
  await page.getByRole('button', { name: /Calendar$/ }).click();

  const scroller = page.locator('.calendar-scroll');
  await expect(scroller).toBeVisible();
  const overflow = await scroller.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBe(0);
});
