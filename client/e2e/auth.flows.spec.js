import { DESKTOP, PASSWORD, PHONE, expect, test as base } from './fixtures.js';
import { removeAccount } from './accounts.js';

const DEVICES = { phone: PHONE, desktop: DESKTOP };

const test = base.extend({
  newUserName: async ({ playwright }, use) => {
    const userName = `e2e.signup.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@smu.edu.sg`;
    await use(userName);
    await removeAccount(playwright, userName, [PASSWORD]);
  },
});

async function openForm(page, size, tab) {
  await page.setViewportSize(size);
  await page.goto('/login');
  await page.locator('#slider').getByRole('button', { name: tab }).click();
  return page.locator('#panel form:visible');
}

async function fillLogIn(form, { userName, password }) {
  await form.getByLabel('SMU email').fill(userName);
  await form.getByLabel('Password', { exact: true }).fill(password);
}

async function fillSignUp(form, userName) {
  await form.getByLabel('SMU email').fill(userName);
  await form.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await form.getByLabel('Re-enter password').fill(PASSWORD);
}

for (const [device, size] of Object.entries(DEVICES)) {
  test.describe(device, () => {
    test('rejects a wrong password and keeps the form', async ({ page, account }) => {
      const form = await openForm(page, size, 'Log in');
      await fillLogIn(form, { userName: account.userName, password: 'Password9!' });
      await form.getByRole('button', { name: 'Log in' }).click();

      await expect(form.getByRole('alert')).toHaveText('Wrong password!');
      await expect(form.getByLabel('SMU email')).toHaveValue(account.userName);
      await expect(form.getByLabel('Password', { exact: true })).toHaveValue('');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('refuses a duplicate sign-up', async ({ page, account }) => {
      const form = await openForm(page, size, 'Sign up');
      await fillSignUp(form, account.userName);
      await form.getByRole('button', { name: 'Create account' }).click();

      await expect(form.getByRole('alert')).toHaveText('This email is already in use.');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('signs up, lands on onboarding, and is sent away from login afterwards', async ({
      page,
      newUserName,
    }) => {
      const form = await openForm(page, size, 'Sign up');
      await fillSignUp(form, newUserName);
      await form.getByRole('button', { name: 'Create account' }).click();
      await page.waitForURL((url) => url.pathname === '/onboarding');

      await page.goto('/login');

      await page.waitForURL((url) => url.pathname === '/onboarding');
      await expect(page.locator('#panel')).toHaveCount(0);
    });

    test('remembers the email across reloads', async ({ page, account }) => {
      const form = await openForm(page, size, 'Log in');
      await fillLogIn(form, account);
      await form.getByLabel('Remember my email').check();
      await form.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL((url) => url.pathname === '/home');

      // every response renews the session cookie, so leave the dashboard first: that cancels its
      // in-flight requests, and none of them can set the cookie again after it is cleared
      await page.goto('about:blank');
      await page.context().clearCookies();
      await page.goto('/login');

      const again = page.locator('#panel form:visible');
      await expect(again.getByLabel('SMU email')).toHaveValue(account.userName);
      await expect(again.getByLabel('Remember my email')).toBeChecked();
      await expect(again.getByLabel('Password', { exact: true })).toHaveValue('');
    });
  });
}
