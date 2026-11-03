import { readFileSync } from 'node:fs';
import { WIDTHS, test, expect, expectNoHorizontalOverflow, screenshot } from './fixtures.js';

const SM = 576;
const SEARCH_WIDTH = 260;
const OPPORTUNITIES = JSON.parse(
  readFileSync(new URL('./fixtures/opportunities.json', import.meta.url), 'utf8'),
);

async function openTeams(page, width) {
  await page.route('**/opportunity/all*', (route) => route.fulfill({ json: OPPORTUNITIES }));
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Teammate finder' })).toBeVisible();
}

async function box(locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds;
}

test.describe('teams page', () => {
  for (const width of WIDTHS) {
    test(`${width} fits the header controls`, async ({ loggedIn: page }, testInfo) => {
      await openTeams(page, width);

      const search = await box(page.locator('.team-search'));
      expect(search.width).toBeLessThanOrEqual(SEARCH_WIDTH);
      expect(search.width < SEARCH_WIDTH).toBe(width < SM);
      await expect(page.getByRole('link', { name: 'Your profile' })).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-header-${width}`);
    });
  }
});
