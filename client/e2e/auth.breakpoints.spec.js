import process from 'node:process';
import { expect, test } from '@playwright/test';

const MD = 768;
const SM = 576;
const GUTTER = 16;
const PASSWORD = 'Password1!';
const STATE_TABS = { login: 'Log in', signup: 'Sign up' };

const SIZES = [
  { width: 320, height: 900 },
  { width: 375, height: 900 },
  { width: 375, height: 667 },
  { width: 576, height: 900 },
  { width: 768, height: 900 },
  { width: 992, height: 900 },
  { width: 1200, height: 900 },
  { width: 1440, height: 900 },
];

const CASES = SIZES.flatMap((size) =>
  ['login', 'signup'].map((state) => ({
    name: `${state}-${size.width}x${size.height}`,
    size,
    state,
    wide: size.width >= MD,
    maxCardWidth: size.width >= SM ? 480 : size.width - 2 * GUTTER,
    passwordHint: state === 'login' ? 'current-password' : 'new-password',
  })),
);

async function openAuthPage(page, { size, state }) {
  await page.route('**/me', (route) =>
    route.fulfill({ json: { isAuthenticated: false, user: null } }),
  );
  await page.setViewportSize(size);
  await page.goto('/login');
  await page.locator('#slider').getByRole('button', { name: STATE_TABS[state] }).click();
  await expect(page.locator('#panel form:visible')).toBeVisible();
}

async function smallestInputFontSize(page) {
  const fontSizes = await page
    .locator('.form-control:visible')
    .evaluateAll((inputs) => inputs.map((input) => parseFloat(getComputedStyle(input).fontSize)));
  return Math.min(...fontSizes);
}

for (const authCase of CASES) {
  test(`${authCase.name} lays out the page`, async ({ page }) => {
    await openAuthPage(page, authCase);
    await page.screenshot({ path: `e2e/__screenshots__/auth/${authCase.name}.png` });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expect(page.locator('#banner')).toBeVisible({ visible: authCase.wide });
    await expect(page.locator('#brandHeader')).toBeVisible({ visible: !authCase.wide });

    const card = await page.locator('#panel').boundingBox();
    expect(card.x).toBeGreaterThanOrEqual(GUTTER);
    expect(authCase.size.width - (card.x + card.width)).toBeGreaterThanOrEqual(GUTTER);
    expect(card.width).toBeLessThanOrEqual(authCase.maxCardWidth);

    await expect(page.locator('a[href=""]')).toHaveCount(0);
    await expect(page.locator('input[type="email"]:visible')).toHaveAttribute(
      'autocomplete',
      'username',
    );
    for (const input of await page.locator('input[type="password"]:visible').all()) {
      await expect(input).toHaveAttribute('autocomplete', authCase.passwordHint);
    }
  });
}

for (const authCase of CASES.filter((c) => !c.wide && c.state === 'login')) {
  test(`${authCase.name} fits the log in form on a phone`, async ({ page }) => {
    await openAuthPage(page, authCase);

    expect(await smallestInputFontSize(page)).toBeGreaterThanOrEqual(16);
    await expect(page.locator('main')).toHaveCSS('padding-bottom', '0px');
    await page.locator('input[type="email"]:visible').focus();
    await expect(page.locator('button[type="submit"]:visible')).toBeInViewport();
  });
}

for (const authCase of CASES.filter((c) => !c.wide && c.state === 'signup')) {
  test(`${authCase.name} fits the sign up form on a phone`, async ({ page }) => {
    await openAuthPage(page, authCase);

    expect(await smallestInputFontSize(page)).toBeGreaterThanOrEqual(16);
    await expect(page.locator('main')).toHaveCSS('padding-bottom', '0px');
  });
}

test.describe('logged in', () => {
  const userName = `auth.${Date.now()}@smu.edu.sg`;

  test.skip(!process.env.API_URL, 'needs a running API, set API_URL');

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${process.env.API_URL}/register`, {
      data: { userName, password: PASSWORD },
    });
    expect(response.status()).toBe(201);
  });

  test.afterAll(async ({ request }) => {
    await request.post(`${process.env.API_URL}/login`, { data: { userName, password: PASSWORD } });
    await request.delete(`${process.env.API_URL}/me`, { data: { password: PASSWORD } });
  });

  test('pads the page for the tab bar only below md', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/login');
    await page.locator('input[type="email"]:visible').fill(userName);
    await page.locator('input[type="password"]:visible').fill(PASSWORD);
    await page.locator('button[type="submit"]:visible').click();
    await page.waitForURL('**/home');

    await expect(page.locator('main')).toHaveCSS('padding-bottom', '96px');

    await page.setViewportSize({ width: MD, height: 900 });
    await expect(page.locator('main')).not.toHaveCSS('padding-bottom', '96px');
  });
});
