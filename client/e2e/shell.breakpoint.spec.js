import { PHONE, expect, test } from './fixtures.js';

const TABLET = { width: 768, height: 1024 };

test.describe('login banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/me', (route) =>
      route.fulfill({ json: { isAuthenticated: false, user: null } }),
    );
  });

  test('shows from md up and hides below it', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/login');
    await expect(page.locator('.brand-banner')).toBeVisible();

    await page.setViewportSize(PHONE);
    await expect(page.locator('.brand-banner')).toBeHidden();
  });
});

test.describe('app shell', () => {
  test('switches between the sidebar and the tab bar at md', async ({ loggedIn: page }) => {
    await page.goto('/home');

    await page.setViewportSize(TABLET);
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();

    await page.setViewportSize(PHONE);
    await expect(page.locator('#sidebar')).toBeHidden();
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('starts the sidebar collapsed below lg and open from lg up', async ({
    loggedIn: page,
    account,
  }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/home');

    await expect(page.locator('#sidebar')).toHaveCSS('width', '80px');
    await expect(page.locator('#profile').getByText(account.userName)).toBeHidden();

    await page.setViewportSize({ width: 1200, height: 900 });
    await page.reload();
    await expect(page.locator('#sidebar')).toHaveCSS('width', '260px');
  });
});
