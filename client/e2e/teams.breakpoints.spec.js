import { readFileSync } from 'node:fs';
import {
  WIDTHS,
  test as base,
  expect,
  expectNoHorizontalOverflow,
  registerAccount,
  screenshot,
} from './fixtures.js';

const SM = 576;
const MD = 768;
const LG = 992;
const XL = 1200;
const SEARCH_WIDTH = 260;
const OPPORTUNITIES = JSON.parse(
  readFileSync(new URL('./fixtures/opportunities.json', import.meta.url), 'utf8'),
);

const test = base.extend({
  requester: async ({ playwright }, use) => {
    const requester = await registerAccount(playwright, 'teams.requester');
    await use(requester);
    await requester.dispose();
  },
});

function tagFor(testInfo) {
  return `w${testInfo.workerIndex}.${Date.now()}`;
}

async function postTeam(owner, name, tag) {
  const response = await owner.api.post('/teams', {
    data: {
      name,
      eventName: `Layout ${tag}`,
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a working demo every weekend.',
      skills: ['Vue.js'],
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function openTeams(page, width) {
  await page.route('**/opportunity/hackathons*', (route) =>
    route.fulfill({ json: OPPORTUNITIES.hackathons }),
  );
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Teammate finder' })).toBeVisible();
}

function tab(page, name) {
  return page.locator('main .tab-cards').getByRole('tab', { name });
}

async function box(locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds;
}

function columnsAt(width) {
  if (width >= XL) return 3;
  if (width >= MD) return 2;
  return 1;
}

function arrangement(first, second) {
  if (Math.round(first.y) === Math.round(second.y) && second.x >= first.x + first.width - 1) {
    return 'side by side';
  }
  if (Math.round(first.x) === Math.round(second.x) && second.y >= first.y + first.height - 1) {
    return 'stacked';
  }
  return 'overlapping';
}

function requestsPanelAt(width) {
  return width >= LG ? 'side by side' : 'stacked';
}

async function createModalLayout(dialog, width) {
  const [eventName, location, closes, modal] = await dialog.evaluate((element) =>
    [
      '[aria-label="Event name"]',
      '[aria-label="Event location"]',
      '[aria-label="Closing date"]',
      '.modal-content',
    ].map((selector) => {
      const { x, y, width, height } = element.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  return {
    nameThenLocation: arrangement(eventName, location),
    locationThenDate: arrangement(location, closes),
    nameOnItsOwnRow: eventName.width > location.width + closes.width,
    modalStartsInView: modal.x >= 0,
    modalEndsInView: modal.x + modal.width <= width,
  };
}

function eventFieldsAt(width) {
  return width >= SM
    ? { nameThenLocation: 'side by side', locationThenDate: 'side by side', nameOnItsOwnRow: false }
    : { nameThenLocation: 'stacked', locationThenDate: 'side by side', nameOnItsOwnRow: true };
}

test.describe('teams page', () => {
  for (const width of WIDTHS) {
    test(`${width} fits the header controls`, async ({ loggedIn: page }, testInfo) => {
      await openTeams(page, width);

      // the shared page header: a 260px search box, on its own full-width row on phones
      await expect(page.getByRole('textbox', { name: 'Search teams' })).toBeInViewport({ ratio: 1 });
      const search = await box(page.getByRole('textbox', { name: 'Search teams' }));
      expect(search.width).toBeLessThanOrEqual(width < MD ? width : SEARCH_WIDTH);
      await expect(page.getByRole('link', { name: 'Your profile' })).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-header-${width}`);
    });

    test(`${width} lays out the browse grid and my teams`, async ({
      loggedIn: page,
      account,
      requester,
    }, testInfo) => {
      const tag = tagFor(testInfo);
      for (const index of [1, 2, 3]) {
        await postTeam(requester, `Browse ${index} ${tag}`, tag);
      }
      await postTeam(account, `Mine ${tag}`, tag);
      await openTeams(page, width);

      await page.getByLabel('Search teams').fill(tag);
      const cards = page.locator('.row-cols-1 > .col');
      await expect(cards).toHaveCount(4);
      await expect(cards.first()).toContainText(`Mine ${tag}`);
      const columns = await Promise.all([0, 1, 2].map((index) => box(cards.nth(index))));
      expect(new Set(columns.map((card) => Math.round(card.x))).size).toBe(columnsAt(width));
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-browse-${width}`);

      await tab(page, /My teams/).click();
      await expect(page.locator('.card', { hasText: `Mine ${tag}` })).toBeVisible();
      await page.getByRole('button', { name: 'Edit post' }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Edit post' })).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-mine-${width}`);
    });

    test(`${width} stacks the requests panel below lg`, async ({
      loggedIn: page,
      account,
      requester,
    }, testInfo) => {
      const tag = tagFor(testInfo);
      const team = await postTeam(account, `Lead ${tag}`, tag);
      const request = await requester.api.post(`/teams/${team._id}/requests`, {
        data: { role: 'Vue.js', message: 'Keen to help.' },
      });
      expect(request.status()).toBe(201);
      await openTeams(page, width);

      await tab(page, /Requests/).click();
      await expect(page.getByText('wants to join')).toBeVisible();
      const incoming = await box(page.locator('.col-lg-8'));
      const ledTeams = await box(page.locator('.col-lg-4'));
      expect(arrangement(incoming, ledTeams)).toBe(requestsPanelAt(width));
      await page.getByRole('button', { name: 'Accept' }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Accept' })).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-requests-${width}`);
    });

    test(`${width} fits the create modal`, async ({ loggedIn: page }, testInfo) => {
      await openTeams(page, width);

      await page.getByRole('button', { name: 'Create team post' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create a team post' });
      await expect(dialog.getByLabel('Hackathon or competition')).toHaveValue('devpost-9101');
      await dialog.getByLabel('Hackathon or competition').selectOption('other');
      await expect(dialog.getByLabel('Closing date')).toBeVisible();
      await expect
        .poll(() => createModalLayout(dialog, width))
        .toEqual({ ...eventFieldsAt(width), modalStartsInView: true, modalEndsInView: true });
      await expect(dialog.getByRole('button', { name: 'Publish post' })).toBeInViewport({
        ratio: 1,
      });
      await expectNoHorizontalOverflow(page);
      await screenshot(page, testInfo, `teams-create-${width}`);
    });
  }
});
