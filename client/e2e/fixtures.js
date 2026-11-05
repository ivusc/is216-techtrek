import process from 'node:process';
import { test as base, expect } from '@playwright/test';

export { expect };

export const PASSWORD = 'Password1!';
export const WIDTHS = [320, 375, 576, 768, 992, 1200, 1440];
export const PHONE = { width: 393, height: 851 };
export const DESKTOP = { width: 1200, height: 900 };

export async function registerAccount(playwright, prefix) {
  const userName = `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@smu.edu.sg`;
  const api = await playwright.request.newContext({ baseURL: process.env.API_URL });
  const response = await api.post('/register', { data: { userName, password: PASSWORD } });
  expect(response.status()).toBe(201);
  const onboarded = await api.patch('/me', { data: { onboarded: true } });
  expect(onboarded.status()).toBe(200);

  return {
    userName,
    password: PASSWORD,
    api,
    async dispose() {
      await api.post('/login', { data: { userName, password: PASSWORD }, maxRetries: 3 });
      const deleted = await api.delete('/me', { data: { password: PASSWORD }, maxRetries: 3 });
      expect.soft(deleted.status()).toBe(204);
      await api.dispose();
    },
  };
}

async function logIn(page, { userName, password }) {
  const response = await page.request.post(`${process.env.API_URL}/login`, {
    data: { userName, password },
  });
  expect(response.status()).toBe(200);
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const sideways = (element) => element.scrollWidth - element.clientWidth;
    const main = document.querySelector('main');
    return { document: sideways(document.documentElement), main: main ? sideways(main) : 0 };
  });
  expect(overflow).toEqual({ document: 0, main: 0 });
}

export async function expectInside(inner, outer) {
  const innerBox = await inner.boundingBox();
  const outerBox = await outer.boundingBox();
  expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x);
  expect(innerBox.x + innerBox.width).toBeLessThanOrEqual(outerBox.x + outerBox.width + 0.5);
}

export async function expectGutters(dialog, width, gutter) {
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(gutter);
  expect(width - (box.x + box.width)).toBeGreaterThanOrEqual(gutter);
}

// a card's "..." menu can still be settling into place just after it opens, so a click on one
// of its items may miss; keep opening it and clicking until `done` (an assertion) passes
export async function chooseFromCardMenu(page, title, itemName, done) {
  const item = page.locator('.dropdown-menu.show').getByRole('button', { name: itemName });
  await expect(async () => {
    if (!(await item.isVisible())) await page.getByRole('button', { name: `Move ${title}` }).click();
    await item.click({ timeout: 2000 });
    await done();
  }).toPass();
}

export function screenshot(target, testInfo, name) {
  return target.screenshot({
    path: `e2e/__screenshots__/${testInfo.project.name}/${name}.png`,
  });
}

export const test = base.extend({
  account: async ({ playwright }, use, testInfo) => {
    const account = await registerAccount(playwright, `e2e.w${testInfo.workerIndex}`);
    await use(account);
    await account.dispose();
  },
  loggedIn: async ({ page, account }, use) => {
    await logIn(page, account);
    await use(page);
  },
});
