import { readFileSync } from 'node:fs';
import {
  DESKTOP,
  PHONE,
  WIDTHS,
  test as base,
  expect,
  expectNoHorizontalOverflow,
  registerAccount,
  screenshot,
} from './fixtures.js';

const OPPORTUNITIES = JSON.parse(
  readFileSync(new URL('./fixtures/opportunities.json', import.meta.url), 'utf8'),
);
const LONG_TITLE = 'Codegeist 2026: Build with context. Ship with confidence.';

const test = base.extend({
  leaderPosts: async ({ playwright }, use, testInfo) => {
    const tag = `w${testInfo.workerIndex}.${Date.now()}`;
    const fullEvent = `AI Builders Challenge ${tag}`;
    const leader = await registerAccount(playwright, 'teams.leader');
    const joiner = await registerAccount(playwright, 'teams.joiner');
    const open = await postTeam(leader, {
      name: `Open ${tag}`,
      eventName: 'Build for Good',
      teamSize: 4,
      openSlots: 2,
    });
    const full = await postTeam(leader, {
      name: `Full ${tag}`,
      eventName: fullEvent,
      teamSize: 2,
      openSlots: 1,
    });
    const sent = await joiner.api.post(`/teams/${full._id}/requests`, {
      data: { role: 'Vue.js' },
    });
    expect(sent.status()).toBe(201);
    const incoming = await (await leader.api.get('/teams/requests/incoming')).json();
    const request = incoming.find((candidate) => candidate.team._id === full._id);
    const accepted = await leader.api.patch(`/teams/requests/${request._id}`, {
      data: { status: 'accepted' },
    });
    expect(accepted.status()).toBe(200);

    await use({ open: open.name, full: full.name, fullEvent });

    await joiner.dispose();
    await leader.dispose();
  },
});

async function postTeam(owner, { name, eventName, teamSize, openSlots }) {
  const response = await owner.api.post('/teams', {
    data: {
      name,
      eventName,
      teamSize,
      openSlots,
      pitch: 'We ship a working demo every weekend.',
      skills: ['Vue.js'],
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

function renameHackathon(externalId, title) {
  const hackathons = OPPORTUNITIES.hackathons.hackathons.map((hackathon) =>
    hackathon.externalId === externalId ? { ...hackathon, title } : hackathon,
  );
  return { ...OPPORTUNITIES, hackathons: { ...OPPORTUNITIES.hackathons, hackathons } };
}

async function mockOpportunities(page, opportunities) {
  await page.route('**/opportunity/**', (route) => route.abort());
  await page.route('**/opportunity/all*', (route) => route.fulfill({ json: opportunities }));
  await page.route('**/opportunity/jobs*', (route) => route.fulfill({ json: opportunities.jobs }));
  await page.route('**/opportunity/hackathons*', (route) =>
    route.fulfill({ json: opportunities.hackathons }),
  );
}

async function findTeam(page, title) {
  await page.goto('/opportunities');
  await page
    .getByRole('button', { name: /^Hackathons/ })
    .filter({ visible: true })
    .click();
  await page
    .locator('.opp-card', { hasText: title })
    .getByRole('button', { name: /^Find team/ })
    .click();
  const panel = page.getByRole('dialog', { name: title });
  await expect(panel).toBeVisible();
  return panel;
}

async function openInTeams(page, panel, title) {
  await panel.getByRole('link', { name: /Open in Teams/ }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/teams' && url.searchParams.get('event') === title,
  );
  await expect(page.getByLabel('Filter by event')).toHaveValue(title);
}

function teamCard(page, name) {
  return page.locator('.card', { has: page.getByRole('heading', { name, exact: true }) });
}

async function expectInsideMain(page, locator) {
  const main = await page.locator('main').boundingBox();
  const box = await locator.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(main.x);
  expect(box.x + box.width).toBeLessThanOrEqual(main.x + main.width + 0.5);
}

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test(`${device} follows Find team into Teams filtered to the hackathon and back to every team`, async ({
    loggedIn: page,
    leaderPosts,
  }) => {
    await mockOpportunities(page, renameHackathon('9102', leaderPosts.fullEvent));
    await page.setViewportSize(size);

    const campus = await findTeam(page, 'Campus Makers');
    await expect(campus).toContainText('No teams are looking for members yet');
    await openInTeams(page, campus, 'Campus Makers');
    await expect(
      page.getByText('No teams are looking for members for Campus Makers yet.'),
    ).toBeVisible();
    await expect(page.locator('.row-cols-1 > .col')).toHaveCount(0);
    await page.getByRole('button', { name: 'Start a team' }).click();
    const create = page.getByRole('dialog', { name: 'Create a team post' });
    await expect(create.getByLabel('Hackathon or competition')).toHaveValue('devpost-9103');
    await create.getByRole('button', { name: 'Cancel' }).click();
    await expect(create).toBeHidden();

    await openInTeams(page, await findTeam(page, 'Build for Good'), 'Build for Good');
    await expect(teamCard(page, leaderPosts.open)).toBeVisible();

    await openInTeams(page, await findTeam(page, leaderPosts.fullEvent), leaderPosts.fullEvent);
    await expect(page.getByText('No teams match your filters.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start a team' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open slots only' }).click();
    await expect(teamCard(page, leaderPosts.full)).toBeVisible();

    await page.locator('a[href="/teams"]').filter({ visible: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/teams' && url.search === '');
    await expect(page.getByLabel('Filter by event')).toHaveValue('');
    await expect(teamCard(page, leaderPosts.open)).toBeVisible();
    await expect(teamCard(page, leaderPosts.full)).toBeVisible();
  });
}

test.describe('teams event link', () => {
  for (const width of WIDTHS) {
    test(`${width} fits a long hackathon title in the filter row and the empty state`, async ({
      loggedIn: page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/teams?event=${encodeURIComponent(LONG_TITLE)}`);

      await expect(
        page.getByText(`No teams are looking for members for ${LONG_TITLE} yet.`),
      ).toBeVisible();
      await expect(page.getByLabel('Filter by event')).toHaveValue(LONG_TITLE);
      await screenshot(page, testInfo, `teams-find-team-empty-${width}`);
      await expectNoHorizontalOverflow(page);
      await expectInsideMain(page, page.getByLabel('Filter by event'));
      await expectInsideMain(page, page.getByRole('button', { name: 'Open slots only' }));
      await expectInsideMain(page, page.getByRole('button', { name: 'Start a team' }));
      await expectInsideMain(page, page.getByRole('button', { name: 'See all teams' }));
    });
  }
});
