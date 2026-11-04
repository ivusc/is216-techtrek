import {
  WIDTHS,
  test as base,
  expect,
  expectNoHorizontalOverflow,
  registerAccount,
  screenshot,
} from './fixtures.js';

const TEAM_NAME = 'Suggest Team';

const test = base.extend({
  candidate: async ({ playwright }, use) => {
    const candidate = await registerAccount(playwright, 'suggest.candidate');
    await use(candidate);
    await candidate.dispose();
  },
});

test.describe('suggested teammates', () => {
  for (const width of WIDTHS) {
    test(`${width} shows the leader who matches their team`, async ({
      loggedIn: page,
      account,
      candidate,
    }, testInfo) => {
      const skills = ['Vue.js', 'Figma', `Skill-${Math.random().toString(36).slice(2, 8)}`];
      const profile = await candidate.api.patch('/me', {
        data: { skills, year: 2, course: 'Information Systems' },
      });
      const { user } = await profile.json();
      const team = await account.api.post('/teams', {
        data: {
          name: TEAM_NAME,
          eventName: 'Hack&Roll',
          teamSize: 4,
          openSlots: 2,
          pitch: 'Ship it',
          skills,
        },
      });
      expect(team.status()).toBe(201);

      await page.setViewportSize({ width, height: 900 });
      await page.goto('/teams');
      await page.getByRole('tab', { name: /My teams/ }).click();

      const card = page.locator('.card', { hasText: TEAM_NAME });
      await card.getByRole('button', { name: /match(es)? your team/ }).click();
      await expect(card.getByText(user.displayName)).toBeVisible();
      await screenshot(card, testInfo, `teams/suggestions-${width}`);

      await expectNoHorizontalOverflow(page);
    });
  }
});
