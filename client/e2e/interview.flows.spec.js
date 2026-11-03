import { DESKTOP, expect, test } from './fixtures.js';

test('leaves the Bootstrap progress bar on the Teams page at its own height', async ({
  loggedIn: page,
  account,
}) => {
  const created = await account.api.post('/teams', {
    data: {
      name: 'Progress Check',
      eventName: 'Hack&Roll',
      teamSize: 4,
      openSlots: 2,
      pitch: 'We ship a demo every weekend.',
    },
  });
  expect(created.status()).toBe(201);
  await page.setViewportSize(DESKTOP);
  await page.goto('/teams');
  await page.locator('main nav.nav-underline').getByRole('button', { name: 'Requests' }).click();

  const track = page.getByRole('progressbar');
  await expect(track).toBeVisible();
  const heights = await track.evaluate((element) => ({
    track: element.getBoundingClientRect().height,
    bar: element.querySelector('.progress-bar').getBoundingClientRect().height,
  }));
  expect(heights.bar).toBe(heights.track);
});
