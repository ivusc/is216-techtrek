import { DESKTOP, PHONE, chooseFromCardMenu, expect, test } from './fixtures.js';

async function track(account, { title, organisation, status }) {
  const response = await account.api.post('/application', {
    data: { opportunity: { source: 'manual', type: 'job', title, organisation }, status },
  });
  expect(response.status()).toBe(201);
}

function moveToHistory(page, title) {
  return chooseFromCardMenu(page, title, 'Move to history', () =>
    expect(page.locator('.kanban-card', { hasText: title })).toHaveCount(0, { timeout: 5000 }),
  );
}

function historyButton(page) {
  return page.getByRole('button', { name: /History \d+$/ });
}

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test.describe(`${device} tracker history`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('moves a card to History and back to the board, surviving reloads', async ({
      loggedIn: page,
      account,
    }) => {
      await track(account, { title: 'Frontend Intern', organisation: 'Acme', status: 'offer' });
      await page.goto('/tracker');
      const card = page.locator('.kanban-card', { hasText: 'Frontend Intern' });
      await expect(card).toBeVisible();
      await expect(historyButton(page)).toHaveText(/History\s*0$/);

      await moveToHistory(page, 'Frontend Intern');

      await expect(card).toHaveCount(0);
      await expect(historyButton(page)).toHaveText(/History\s*1$/);

      await page.reload();
      await expect(card).toHaveCount(0);
      await historyButton(page).click();
      const history = page.locator('.tracker-history');
      const row = history.locator('li', { hasText: 'Frontend Intern' });
      await expect(row).toContainText('Acme');
      await expect(row.locator('.history-outcome')).toHaveText('Offer');
      await expect(history).toContainText('1 finished');

      await row.getByRole('button', { name: 'Back to board' }).click();

      await expect(row).toHaveCount(0);
      await expect(history).toContainText('Nothing in your history yet');
      await page.getByRole('button', { name: /Board$/ }).click();
      await expect(card).toBeVisible();
      await page.reload();
      await expect(card).toBeVisible();
      await expect(historyButton(page)).toHaveText(/History\s*0$/);
    });

    test('opens the details of a finished card from History', async ({ loggedIn: page, account }) => {
      await track(account, { title: 'Data Analyst', organisation: 'Grab', status: 'rejected' });
      await page.goto('/tracker');
      await moveToHistory(page, 'Data Analyst');
      await historyButton(page).click();

      await page.locator('.tracker-history .history-open', { hasText: 'Data Analyst' }).click();

      await expect(page.getByRole('dialog', { name: 'Data Analyst' })).toBeVisible();
    });
  });
}
