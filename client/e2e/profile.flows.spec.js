import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { DESKTOP, PHONE, expect, registerAccount, test as base } from './fixtures.js';
import { removeAccount } from './accounts.js';

const AVATAR = fileURLToPath(new URL('./fixtures/avatar.png', import.meta.url));
const NEW_PASSWORD = 'Password2!';
const NOT_REGISTERED =
  'This email has not been registered with us. Click on Sign up to create an account!';

const test = base.extend({
  passwordAccount: async ({ playwright }, use) => {
    const account = await registerAccount(playwright, 'e2e.password');
    await account.api.dispose();
    await use(account);
    await removeAccount(playwright, account.userName, [NEW_PASSWORD, account.password]);
  },
  doomedAccount: async ({ playwright }, use) => {
    const account = await registerAccount(playwright, 'e2e.delete');
    await account.api.dispose();
    await use(account);
    await removeAccount(playwright, account.userName, [account.password]);
  },
});

const identityCard = (page) => page.locator('.identity-card');
const headerLink = (page) => page.getByRole('link', { name: 'Your profile' });
const profileMenu = (page, account) => page.getByRole('button', { name: account.userName });

const DEVICES = [
  {
    name: 'desktop',
    size: DESKTOP,
    avatarHolders: [identityCard, headerLink, profileMenu],
    signOut: async (page, account) => {
      await profileMenu(page, account).click();
      await page.getByRole('button', { name: 'Sign out' }).click();
    },
  },
  {
    name: 'phone',
    size: PHONE,
    avatarHolders: [identityCard, headerLink],
    signOut: (page) => page.getByRole('button', { name: 'Sign out' }).click(),
  },
];

async function logInPage(page, { userName, password }) {
  const response = await page.request.post(`${process.env.API_URL}/login`, {
    data: { userName, password },
  });
  expect(response.status()).toBe(200);
}

async function openProfile(page, size) {
  await page.setViewportSize(size);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
}

async function displayNameOf(page) {
  const response = await page.request.get(`${process.env.API_URL}/me`);
  return (await response.json()).user.displayName;
}

async function logInThroughForm(page, { userName, password }) {
  const form = page.locator('#panel form:visible');
  await form.getByLabel('SMU email').fill(userName);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await form.getByRole('button', { name: 'Log in' }).click();
  return form;
}

for (const { name, size, avatarHolders, signOut } of DEVICES) {
  test.describe(name, () => {
    test('uploads a photo and sees it on every avatar on the page', async ({
      loggedIn: page,
      account,
    }) => {
      await openProfile(page, size);
      const displayName = await displayNameOf(page);

      await page.getByLabel('Add a photo').setInputFiles(AVATAR);

      await expect(page.getByRole('button', { name: 'Remove photo' })).toBeVisible();
      for (const holder of avatarHolders) {
        const photo = holder(page, account).getByTitle(displayName).getByRole('img');
        await expect(photo).toHaveAttribute('src', /\/users\/[0-9a-f]{24}\/avatar\?v=/);
        await expect.poll(() => photo.evaluate((img) => img.naturalWidth)).toBe(256);
      }
    });

    test('removes the photo and gets initials back', async ({ loggedIn: page, account }) => {
      const upload = await page.request.put(`${process.env.API_URL}/me/avatar`, {
        data: readFileSync(AVATAR),
        headers: { 'Content-Type': 'image/png' },
      });
      expect(upload.status()).toBe(200);
      await openProfile(page, size);
      const displayName = await displayNameOf(page);
      await expect(identityCard(page).getByRole('img', { name: displayName })).toBeVisible();

      await page.getByRole('button', { name: 'Remove photo' }).click();

      await expect(page.getByRole('button', { name: 'Remove photo' })).toHaveCount(0);
      for (const holder of avatarHolders) {
        const avatar = holder(page, account)
          .getByTitle(displayName)
          .and(page.locator('.rounded-circle'));
        await expect(avatar.getByRole('img')).toHaveCount(0);
        await expect(avatar).toHaveText(/^[A-Z0-9]{2}$/);
      }
    });

    test('changes the password and logs in with the new one', async ({ page, passwordAccount }) => {
      await logInPage(page, passwordAccount);
      await openProfile(page, size);
      await page.getByLabel('Current password').fill(passwordAccount.password);
      await page.getByLabel('New password').fill(NEW_PASSWORD);
      await page.getByRole('button', { name: 'Change password' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Password changed.' })).toBeVisible();

      await signOut(page, passwordAccount);
      await page.waitForURL((url) => url.pathname === '/login');
      const form = await logInThroughForm(page, passwordAccount);
      await expect(form.getByRole('alert')).toHaveText('Wrong password!');
      await logInThroughForm(page, { userName: passwordAccount.userName, password: NEW_PASSWORD });

      await page.waitForURL((url) => url.pathname === '/home');
    });

    test('deletes the account and cannot log in again', async ({ page, doomedAccount }) => {
      await logInPage(page, doomedAccount);
      await openProfile(page, size);

      await page.getByLabel('Type your password to confirm').fill(doomedAccount.password);
      await page.getByRole('button', { name: 'Delete account' }).click();
      await page.waitForURL((url) => url.pathname === '/login');
      const form = await logInThroughForm(page, doomedAccount);

      await expect(form.getByRole('alert')).toHaveText(NOT_REGISTERED);
    });
  });
}
