import { WIDTHS, expect, expectNoHorizontalOverflow, screenshot, test } from './fixtures.js';

const SM = 576;
const MD = 768;
const XL = 1200;
const DAY = 24 * 60 * 60 * 1000;

async function seedTracker(account) {
  const now = Date.now();
  const seeds = [
    {
      opportunity: {
        source: 'manual',
        type: 'job',
        title: 'Frontend Intern',
        organisation: 'Acme',
      },
      status: 'saved',
      deadline: new Date(now + 3 * DAY).toISOString(),
    },
    {
      opportunity: {
        source: 'manual',
        type: 'internship',
        title: 'Data Analyst',
        organisation: 'Grab',
      },
      status: 'interview',
      interviewAt: new Date(now + DAY).toISOString(),
    },
    {
      opportunity: {
        source: 'manual',
        type: 'job',
        title: 'Backend Engineer',
        organisation: 'Shopee',
      },
      status: 'rejected',
    },
    {
      opportunity: {
        source: 'manual',
        type: 'hackathon',
        title: 'Hack&Roll',
        organisation: 'NUS Hackers',
      },
      status: 'registered',
    },
  ];
  for (const seed of seeds) {
    const response = await account.api.post('/application', { data: seed });
    expect(response.status()).toBe(201);
  }
}

async function openTracker(page, account, width) {
  await seedTracker(account);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/tracker');
  await expect(page.locator('.kanban-card')).toHaveCount(3);
}

async function expectTrackerFits(page) {
  await expectNoHorizontalOverflow(page);
  const tracker = page.locator('main > div').first();
  const overflow = await tracker.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBe(0);
}

async function expectScrollsSideways(scroller) {
  const scrolled = await scroller.evaluate((element) => {
    element.scrollBy({ left: 200, behavior: 'instant' });
    return { overflowX: getComputedStyle(element).overflowX, scrollLeft: element.scrollLeft };
  });
  expect(['auto', 'scroll']).toContain(scrolled.overflowX);
  expect(scrolled.scrollLeft).toBeGreaterThan(0);
}

async function expectInside(inner, outer) {
  const innerBox = await inner.boundingBox();
  const outerBox = await outer.boundingBox();
  expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x);
  expect(innerBox.x + innerBox.width).toBeLessThanOrEqual(outerBox.x + outerBox.width + 0.5);
}

async function expectGutters(dialog, width, gutter) {
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(gutter);
  expect(width - (box.x + box.width)).toBeGreaterThanOrEqual(gutter);
}

async function expectFieldsSideBySide(first, second, sideBySide) {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(secondBox.x > firstBox.x).toBe(sideBySide);
  expect(secondBox.y >= firstBox.y + firstBox.height).toBe(!sideBySide);
}

test.describe('tracker board', () => {
  for (const width of WIDTHS) {
    test(`${width} lays out the toolbar and the board`, async ({
      loggedIn: page,
      account,
    }, testInfo) => {
      await openTracker(page, account, width);
      await screenshot(page, testInfo, `tracker-board-${width}`);

      await expectTrackerFits(page);
      await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible({
        visible: width < MD,
      });
      await expect(page.locator('#tracker-filters')).toBeVisible({ visible: width >= MD });
      await expectInside(
        page.getByRole('button', { name: /Add application$/ }),
        page.locator('main'),
      );
    });
  }

  for (const width of WIDTHS) {
    test(`${width} switches to the hackathon board`, async ({
      loggedIn: page,
      account,
    }, testInfo) => {
      await openTracker(page, account, width);
      const hackathons = page.getByRole('tab', { name: /Hackathons/ });

      await expectInside(hackathons, page.locator('main'));
      await hackathons.click();

      await expect(hackathons).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.kanban-column')).toHaveCount(5);
      await expect(page.locator('.kanban-card')).toHaveText([/Hack&Roll/]);
      await expect(page.getByRole('button', { name: /Add event$/ })).toBeVisible();
      await screenshot(page, testInfo, `tracker-hackathons-${width}`);
      await expectTrackerFits(page);
    });
  }

  for (const width of WIDTHS.filter((candidate) => candidate < MD)) {
    test(`${width} opens the filters on a phone`, async ({ loggedIn: page, account }) => {
      await openTracker(page, account, width);
      const toggle = page.getByRole('button', { name: /^Filters/ });

      await toggle.click();

      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#tracker-filters')).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Type' })).toBeVisible();
      await expectTrackerFits(page);
    });
  }

  for (const width of WIDTHS.filter((candidate) => candidate < 1440)) {
    test(`${width} scrolls the board sideways inside the page`, async ({
      loggedIn: page,
      account,
    }) => {
      await openTracker(page, account, width);

      const board = page.locator('.kanban-board');
      await expect(board).toBeVisible();
      await expectScrollsSideways(board);
      await expectTrackerFits(page);
    });
  }
});

test.describe('tracker calendar', () => {
  for (const width of WIDTHS) {
    test(`${width} stacks or sides the calendar panels`, async ({
      loggedIn: page,
      account,
    }, testInfo) => {
      await openTracker(page, account, width);
      await page.getByRole('button', { name: /Calendar$/ }).click();
      await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
      await screenshot(page, testInfo, `tracker-calendar-${width}`);

      await expectTrackerFits(page);
      const month = await page.locator('.calendar-month').boundingBox();
      const side = await page.locator('.calendar-side').boundingBox();
      expect(side.x >= month.x + month.width).toBe(width >= XL);
      expect(side.y >= month.y + month.height).toBe(width < XL);

      const scroller = page.locator('.calendar-scroll');
      const overflow = await scroller.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow > 0).toBe(width < MD);
    });
  }

  for (const width of WIDTHS.filter((candidate) => candidate < MD)) {
    test(`${width} scrolls the month grid sideways inside its card`, async ({
      loggedIn: page,
      account,
    }) => {
      await openTracker(page, account, width);
      await page.getByRole('button', { name: /Calendar$/ }).click();

      const grid = page.locator('.calendar-scroll');
      await expect(grid).toBeVisible();
      await expectScrollsSideways(grid);
      await expectTrackerFits(page);
    });
  }
});

test.describe('tracker modals', () => {
  for (const width of WIDTHS) {
    const gutter = width < SM ? 8 : 16;

    test(`${width} fits the add and detail modals`, async ({
      loggedIn: page,
      account,
    }, testInfo) => {
      await openTracker(page, account, width);

      await page.getByRole('button', { name: /Add application$/ }).click();
      const add = page.getByRole('dialog', { name: 'Add application' });
      await expect(add).toBeVisible();
      await screenshot(page, testInfo, `tracker-add-${width}`);
      await expectTrackerFits(page);
      await expectInside(add.locator('.modal-content'), page.locator('body'));
      await expectGutters(add.locator('.modal-content'), width, gutter);
      const submit = add.getByRole('button', { name: 'Add to Saved' });
      await expect(submit).toBeInViewport({ ratio: 1 });
      await expectInside(submit, add.locator('.modal-content'));
      await expectFieldsSideBySide(
        add.getByLabel('Role / title *'),
        add.getByLabel('Organisation *'),
        width >= SM,
      );
      await add.getByRole('button', { name: 'Cancel' }).click();
      await expect(add).toBeHidden();

      await page.locator('.kanban-card', { hasText: 'Data Analyst' }).click();
      const detail = page.getByRole('dialog', { name: 'Data Analyst' });
      await expect(detail).toBeVisible();
      await screenshot(page, testInfo, `tracker-detail-${width}`);
      await expectTrackerFits(page);
      await expectInside(detail.locator('.modal-content'), page.locator('body'));
      await expectGutters(detail.locator('.modal-content'), width, gutter);
      const save = detail.getByRole('button', { name: 'Save changes' });
      await expect(save).toBeInViewport({ ratio: 1 });
      await expectInside(save, detail.locator('.modal-content'));
      await expectFieldsSideBySide(
        detail.getByLabel('Stage'),
        detail.getByLabel('Interview date'),
        width >= SM,
      );
    });
  }
});
