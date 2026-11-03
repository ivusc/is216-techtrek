import { readFileSync } from 'node:fs';
import process from 'node:process';
import {
  DESKTOP,
  PHONE,
  test as base,
  expect,
  expectNoHorizontalOverflow,
  registerAccount,
} from './fixtures.js';

const OPPORTUNITIES = JSON.parse(
  readFileSync(new URL('./fixtures/opportunities.json', import.meta.url), 'utf8'),
);

const test = base.extend({
  people: async ({ browser, playwright }, use, testInfo) => {
    const accounts = [];
    const contexts = [];
    async function join(prefix, size) {
      const person = await registerAccount(playwright, prefix);
      accounts.push(person);
      if (!size) {
        return person;
      }
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: size,
      });
      contexts.push(context);
      const page = await context.newPage();
      const response = await page.request.post(`${process.env.API_URL}/login`, {
        data: { userName: person.userName, password: person.password },
      });
      expect(response.status()).toBe(200);
      return { ...person, page };
    }
    await use(join);
    for (const context of contexts) {
      await context.close();
    }
    for (const person of accounts) {
      await person.dispose();
    }
  },
});

function tagFor(testInfo) {
  return `w${testInfo.workerIndex}.${Date.now()}`;
}

async function postTeam(owner, { name, skills = ['Vue.js'] }) {
  const response = await owner.api.post('/teams', {
    data: {
      name,
      eventName: 'Hack&Roll',
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a working demo every weekend.',
      skills,
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function openTeams(page, size) {
  await page.route('**/opportunity/hackathons*', (route) =>
    route.fulfill({ json: OPPORTUNITIES.hackathons }),
  );
  await page.setViewportSize(size);
  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Teammate finder' })).toBeVisible();
}

function tab(page, name) {
  return page.locator('main nav.nav-underline').getByRole('button', { name });
}

function teamCard(page, name) {
  return page.locator('.card', { has: page.getByRole('heading', { name, exact: true }) });
}

function sentRow(page, name) {
  return page.locator('.card > .d-flex', { hasText: name });
}

async function createPost(page, { name, teamSize, openSlots, draft = false, other = null }) {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route(
    '**/opportunity/hackathons*',
    async (route) => {
      await held;
      await route.fallback();
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Create team post' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a team post' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Hackathon or competition')).toBeDisabled();
  release();
  if (other) {
    await dialog.getByLabel('Hackathon or competition').selectOption('other');
    await dialog.getByLabel('Event name').fill(other.name);
    await dialog.getByLabel('Event location').fill(other.location);
    await dialog.getByLabel('Closing date').fill(other.closes);
  } else {
    await expect(dialog.getByLabel('Hackathon or competition')).toHaveValue('devpost-9101');
  }
  await dialog.getByLabel('Team name').fill(name);
  if (teamSize) {
    await dialog.getByLabel('Team size').selectOption(teamSize);
  }
  if (openSlots) {
    await dialog.getByLabel('Open slots').selectOption(openSlots);
  }
  await dialog.getByLabel('Pitch').fill('We ship a working demo every weekend.');
  await dialog.getByRole('button', { name: draft ? 'Save draft' : 'Publish post' }).click();
  await expect(dialog).toBeHidden();
  if (!draft) {
    const live = page.getByRole('dialog', { name: `${name} is live!` });
    await live.getByRole('button', { name: 'Done' }).click();
    await expect(live).toBeHidden();
  }
}

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test.describe(device, () => {
    test('publishes a post, a second user requests to join, the leader accepts and the team closes', async ({
      loggedIn: page,
      people,
    }, testInfo) => {
      const name = `Flow ${tagFor(testInfo)}`;
      await openTeams(page, size);
      await createPost(page, { name, teamSize: '2', openSlots: '1' });

      await expect(tab(page, /My teams/)).toHaveClass(/active/);
      await expect(teamCard(page, name)).toContainText('Build for Good');

      const requester = await people('teams.joiner', size);
      await openTeams(requester.page, size);
      await requester.page.getByLabel('Search teams').fill(name);
      await teamCard(requester.page, name).getByRole('button', { name: 'Request to join' }).click();
      const request = requester.page.getByRole('dialog', { name: `Request to join ${name}` });
      await request.getByLabel(/Message to/).fill('Keen to help.');
      await request.getByRole('button', { name: 'Send request' }).click();
      await expect(teamCard(requester.page, name)).toContainText('Request sent');
      await expect(
        teamCard(requester.page, name).getByRole('button', { name: 'Undo' }),
      ).toBeEnabled();

      await page.reload();
      await tab(page, /Requests/).click();
      const incoming = page
        .locator('.card', { hasText: 'wants to join' })
        .filter({ hasText: name });
      await expect(incoming).toContainText('Keen to help.');
      await incoming.getByRole('button', { name: 'Accept' }).click();
      await expect(incoming).toContainText('Accepted');
      await tab(page, /My teams/).click();
      await expect(teamCard(page, name).locator('.badge', { hasText: 'Team full' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const outsider = await people('teams.outsider', size);
      await openTeams(outsider.page, size);
      await outsider.page.getByLabel('Search teams').fill(name);
      await expect(outsider.page.getByText('No teams match your filters.')).toBeVisible();
      await outsider.page.getByRole('button', { name: 'Open slots only' }).click();
      await expect(
        teamCard(outsider.page, name).getByRole('button', { name: 'Team full' }),
      ).toBeDisabled();
    });

    test('saves a draft for a typed event and publishes it from My teams', async ({
      loggedIn: page,
      people,
    }, testInfo) => {
      const tag = tagFor(testInfo);
      const name = `Draft ${tag}`;
      await openTeams(page, size);
      await createPost(page, {
        name,
        draft: true,
        other: { name: `Hack ${tag}`, location: 'SMU', closes: '2030-12-31' },
      });

      const card = teamCard(page, name);
      await expect(card.locator('.badge', { hasText: 'Draft' })).toBeVisible();
      await expect(card).toContainText(`Hack ${tag}`);
      await card.getByRole('button', { name: 'Edit post' }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit team post' });
      await expect(dialog.getByLabel('Hackathon or competition')).toHaveValue('other');
      await expect(dialog.getByLabel('Event name')).toHaveValue(`Hack ${tag}`);
      await dialog.getByRole('button', { name: 'Publish post' }).click();
      await expect(dialog).toBeHidden();

      await expect(card.locator('.badge', { hasText: 'Draft' })).toHaveCount(0);
      await expect(card.getByRole('button', { name: 'Requests' })).toBeVisible();
      await expect(card).toContainText(`Hack ${tag}`);
      const viewer = await people('teams.viewer');
      const listed = await (await viewer.api.get('/teams')).json();
      expect(listed.find((team) => team.name === name)).toMatchObject({
        status: 'open',
        event: { name: `Hack ${tag}`, location: 'SMU' },
      });
    });

    test('declines a request and the requester sees it', async ({
      loggedIn: page,
      account,
      people,
    }, testInfo) => {
      const name = `Decline ${tagFor(testInfo)}`;
      const team = await postTeam(account, { name });
      const requester = await people('teams.declined', size);
      const sent = await requester.api.post(`/teams/${team._id}/requests`, {
        data: { role: 'Vue.js', message: 'Pick me.' },
      });
      expect(sent.status()).toBe(201);

      await openTeams(page, size);
      await tab(page, /Requests/).click();
      const incoming = page
        .locator('.card', { hasText: 'wants to join' })
        .filter({ hasText: name });
      await incoming.getByRole('button', { name: 'Decline' }).click();
      await expect(incoming).toContainText('Declined');
      await expect(incoming.getByRole('button', { name: 'Accept' })).toHaveCount(0);

      await openTeams(requester.page, size);
      await requester.page.getByLabel('Search teams').fill(name);
      await expect(
        teamCard(requester.page, name).getByRole('button', { name: 'Request declined' }),
      ).toBeDisabled();
      await tab(requester.page, /Requests/).click();
      await expect(sentRow(requester.page, name)).toContainText('Declined');
      await expect(
        sentRow(requester.page, name).getByRole('button', { name: 'Withdraw' }),
      ).toHaveCount(0);
    });

    test('withdraws a pending request', async ({ loggedIn: page, account, people }, testInfo) => {
      const name = `Withdraw ${tagFor(testInfo)}`;
      const leader = await people('teams.leader');
      const team = await postTeam(leader, { name });
      const sent = await account.api.post(`/teams/${team._id}/requests`, {
        data: { role: 'Vue.js' },
      });
      expect(sent.status()).toBe(201);

      await openTeams(page, size);
      await tab(page, /Requests/).click();
      await expect(sentRow(page, name)).toContainText('Pending');
      await sentRow(page, name).getByRole('button', { name: 'Withdraw' }).click();
      await expect(page.getByText('You have not asked to join any team yet.')).toBeVisible();

      await tab(page, /Browse teams/).click();
      await page.getByLabel('Search teams').fill(name);
      await expect(
        teamCard(page, name).getByRole('button', { name: 'Request to join' }),
      ).toBeEnabled();
    });

    test('edits skills from the banner and the browse list re-filters', async ({
      loggedIn: page,
      people,
    }, testInfo) => {
      const tag = tagFor(testInfo);
      const skill = `Qwik${tag.replace('.', '')}`;
      const leader = await people('teams.skills');
      await postTeam(leader, { name: `Wants ${tag}`, skills: [skill] });
      await postTeam(leader, { name: `Other ${tag}`, skills: ['Cobol'] });

      await openTeams(page, size);
      await page.getByLabel('Search teams').fill(tag);
      const cards = page.locator('.row-cols-1 > .col');
      await expect(cards).toHaveCount(2);
      await page.getByRole('button', { name: 'Match my skills' }).click();
      await expect(page.getByText('Add your skills to get matched')).toBeVisible();

      await page.getByRole('button', { name: 'Edit skills' }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit your skills' });
      const input = dialog.getByPlaceholder('Type a skill and press Enter');
      await input.fill(skill);
      await input.press('Enter');
      await dialog.getByRole('button', { name: 'Save skills' }).click();
      await expect(dialog).toBeHidden();

      await expect(page.getByText('1 team needs your skills')).toBeVisible();
      await expect(page.locator('.skills-label')).toHaveText(`Skills: ${skill}`);
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText(`Wants ${tag}`);
    });
  });
}
