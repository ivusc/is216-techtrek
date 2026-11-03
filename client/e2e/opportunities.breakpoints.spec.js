import { readFileSync } from 'node:fs';
import {
  DESKTOP,
  PHONE,
  WIDTHS,
  expect,
  expectNoHorizontalOverflow,
  screenshot,
  test,
} from './fixtures.js';

const MD = 768;
const XL = 1200;
const DRAWER_WIDTH = 540;
const READABLE_TITLE_WIDTH = 200;
const SINGLE_LINE_ROWS_FROM = 1440;
const DAY = 24 * 60 * 60 * 1000;
const OPPORTUNITIES = JSON.parse(
  readFileSync(new URL('./fixtures/opportunities.json', import.meta.url), 'utf8'),
);
const URGENT_TITLE = 'International Collegiate Sustainability Innovation Grand Finals';
const WITH_URGENT_HACKATHON = {
  ...OPPORTUNITIES,
  hackathons: {
    count: OPPORTUNITIES.hackathons.count + 1,
    hackathons: [
      {
        ...OPPORTUNITIES.hackathons.hackathons[0],
        externalId: '9199',
        title: URGENT_TITLE,
        deadline: new Date(Date.now() + 3 * DAY).toISOString(),
      },
      ...OPPORTUNITIES.hackathons.hackathons,
    ],
  },
};

async function openOpportunities(page, size, payload = OPPORTUNITIES) {
  const total = payload.jobs.jobs.length + payload.hackathons.hackathons.length;
  await page.route('**/opportunity/**', (route) => route.abort());
  await page.route('**/opportunity/all*', (route) => route.fulfill({ json: payload }));
  await page.route('**/opportunity/jobs*', (route) => route.fulfill({ json: payload.jobs }));
  await page.setViewportSize(size);
  await page.goto('/opportunities');
  await expect(page.getByText(`${total} results`, { exact: true })).toBeVisible();
}

function visibleTabs(page, width) {
  return page.locator(width < MD ? 'nav.chip-row' : 'nav.nav-underline');
}

async function openJobsTab(page, width) {
  await visibleTabs(page, width).getByRole('button', { name: /^Jobs/ }).click();
  await expect(page.locator('.opp-card')).toHaveCount(9);
}

function columnsAt(width) {
  if (width >= XL) return 3;
  if (width >= MD) return 2;
  return 1;
}

async function columnCount(cards) {
  const lefts = await cards.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().x)),
  );
  return new Set(lefts).size;
}

async function settle(locator) {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

test.describe('opportunities layout', () => {
  for (const width of WIDTHS) {
    const phone = width < MD;

    test(`${width} lays out the tabs, filters, cards and drawer`, async ({
      loggedIn: page,
    }, testInfo) => {
      await openOpportunities(page, { width, height: 900 });

      await expect(page.locator('nav.chip-row')).toBeVisible({ visible: phone });
      await expect(page.locator('nav.nav-underline')).toBeVisible({ visible: !phone });
      await expect(page.getByRole('button', { name: /List$/ })).toBeVisible({ visible: !phone });
      await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible({ visible: phone });
      await expect(page.locator('#opportunity-filters')).toBeVisible({ visible: !phone });
      await expect(page.getByText('Internships, jobs and hackathons')).toBeVisible({
        visible: !phone,
      });

      await openJobsTab(page, width);
      const cards = page.locator('.opp-card');
      expect(await columnCount(cards)).toBe(columnsAt(width));
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `opportunities-grid-${width}`);

      await cards.first().getByRole('button', { name: 'Details', exact: true }).click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await settle(drawer);
      const box = await drawer.boundingBox();
      expect(Math.round(box.width)).toBe(Math.min(DRAWER_WIDTH, width));
      expect(Math.round(box.x + box.width)).toBe(width);
      await expect(drawer.getByRole('link', { name: /Apply on Adzuna/ })).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `opportunities-drawer-${width}`);

      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
    });
  }

  for (const width of WIDTHS.filter((candidate) => candidate < MD)) {
    test(`${width} keeps the filters behind the Filters button`, async ({
      loggedIn: page,
    }, testInfo) => {
      await openOpportunities(page, { width, height: 900 });
      const filtersButton = page.getByRole('button', { name: /^Filters/ });
      const filters = page.locator('#opportunity-filters');

      await expect(filtersButton).toHaveAttribute('aria-expanded', 'false');
      await expect(filters).toBeHidden();

      await filtersButton.click();
      await expect(filtersButton).toHaveAttribute('aria-expanded', 'true');
      await expect(filters).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `opportunities-filters-${width}`);

      await filtersButton.click();
      await expect(filtersButton).toHaveAttribute('aria-expanded', 'false');
      await expect(filters).toBeHidden();
    });
  }

  for (const width of WIDTHS.filter((candidate) => candidate >= MD)) {
    test(`${width} lays out the list rows`, async ({ loggedIn: page }, testInfo) => {
      await openOpportunities(page, { width, height: 900 }, WITH_URGENT_HACKATHON);
      await openJobsTab(page, width);

      await page.getByRole('button', { name: /List$/ }).click();
      const row = page.locator('.opp-row').first();
      const main = await row.locator('.opp-row-main').boundingBox();
      const meta = await row.locator('.opp-row-meta').boundingBox();

      expect(meta.y >= main.y + main.height).toBe(width < SINGLE_LINE_ROWS_FROM);
      expect(meta.x >= main.x + main.width).toBe(width >= SINGLE_LINE_ROWS_FROM);
      expect(main.width).toBeGreaterThanOrEqual(READABLE_TITLE_WIDTH);
      const title = row.locator('.opp-row-title');
      await expect(title).toHaveText('Frontend Intern');
      expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );

      await visibleTabs(page, width)
        .getByRole('button', { name: /^Hackathons/ })
        .click();
      const urgentRow = page.locator('.opp-row', { hasText: URGENT_TITLE });
      await expect(urgentRow.locator('.badge')).toHaveText(['Hackathon', '3 days left']);
      const urgentTitle = await urgentRow.locator('.opp-row-title').boundingBox();
      expect(urgentTitle.width).toBeGreaterThanOrEqual(READABLE_TITLE_WIDTH);
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `opportunities-list-${width}`);
    });
  }
});

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test(`${device} tracks an opportunity and finds it in the tracker`, async ({
    loggedIn: page,
  }) => {
    await openOpportunities(page, size);
    const card = () => page.locator('.opp-card', { hasText: 'Frontend Intern' });

    await card()
      .getByRole('button', { name: /Track$/ })
      .click();
    await expect(card().getByRole('button', { name: /Tracked$/ })).toBeVisible();

    await page.reload();
    await expect(card().getByRole('button', { name: /Tracked$/ })).toBeVisible();

    await page.goto('/tracker');
    await expect(page.getByRole('region', { name: 'Saved' })).toContainText('Frontend Intern');
  });
}
