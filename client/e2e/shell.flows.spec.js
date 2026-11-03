import { DESKTOP, PHONE, expect, test } from './fixtures.js';

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test(`${device} sends a guest to login and back to the page they wanted`, async ({
    page,
    account,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/tracker');
    await expect(page).toHaveURL(/\/login\?redirect=\/tracker$/);

    const form = page.locator('#panel form:visible');
    await form.getByLabel('SMU email').fill(account.userName);
    await form.getByLabel('Password').fill(account.password);
    await form.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL((url) => url.pathname === '/tracker');
    await expect(page.getByRole('heading', { name: 'Application tracker' })).toBeVisible();
  });
}

test('signs out from the profile menu', async ({ loggedIn: page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/home');

  await page.locator('#profile').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');

  await page.goto('/home');
  await expect(page).toHaveURL(/\/login\?redirect=\/home$/);
});

test('moves the active pill with navigation', async ({ loggedIn: page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/home');
  const tabBar = page.locator('.bottom-nav');
  const home = tabBar.getByRole('link', { name: 'Home' });
  const tracker = tabBar.getByRole('link', { name: 'Tracker' });

  await expect(home).toHaveAttribute('aria-current', 'page');
  await tracker.click();
  await page.waitForURL('**/tracker');

  await expect(tracker).toHaveAttribute('aria-current', 'page');
  await expect(tabBar.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(tracker.locator('.bottom-nav-icon')).toHaveClass(/bg-primary-subtle/);
  await expect(home.locator('.bottom-nav-icon')).not.toHaveClass(/bg-primary-subtle/);
});

test('keeps the sidebar state through navigation', async ({ loggedIn: page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/home');
  const sidebar = page.locator('#sidebar');
  const currentInMenu = sidebar.locator('ul.nav [aria-current="page"]');
  await expect(sidebar).toHaveCSS('width', '260px');
  await expect(currentInMenu).toHaveCount(1);
  await expect(currentInMenu).toHaveAttribute('href', '/home');

  await sidebar.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(sidebar).toHaveCSS('width', '80px');
  await sidebar.getByTitle('Tracker').click();
  await page.waitForURL('**/tracker');

  await expect(sidebar).toHaveCSS('width', '80px');
  await expect(currentInMenu).toHaveCount(1);
  await expect(currentInMenu).toHaveAttribute('href', '/tracker');
});
