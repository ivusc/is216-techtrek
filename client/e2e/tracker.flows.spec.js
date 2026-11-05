import { readFile } from 'node:fs/promises';
import { DESKTOP, PHONE, chooseFromCardMenu, expect, test } from './fixtures.js';

const DAY = 24 * 60 * 60 * 1000;

async function track(account, { title, organisation, status = 'saved', deadline }) {
  const response = await account.api.post('/application', {
    data: { opportunity: { source: 'manual', type: 'job', title, organisation }, status, deadline },
  });
  expect(response.status()).toBe(201);
}

function stage(page, label) {
  return page.getByRole('region', { name: label, exact: true });
}

for (const [device, size] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  test.describe(`${device} tracker`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('adds an application and sees it in Saved', async ({ loggedIn: page }) => {
      await page.goto('/tracker');
      await page.getByRole('button', { name: /Add application$/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Add application' });
      await dialog.getByLabel('Role / title *').fill('Product Intern');
      await dialog.getByLabel('Organisation *').fill('Carousell');
      await dialog.getByRole('button', { name: 'Add to Saved' }).click();

      await expect(dialog).toBeHidden();
      const card = stage(page, 'Saved').locator('.kanban-card', { hasText: 'Product Intern' });
      await expect(card).toContainText('Carousell');

      await page.reload();
      await expect(card).toContainText('Carousell');
    });

    test('moves a card with the Move-to menu and the change survives a reload', async ({
      loggedIn: page,
      account,
    }) => {
      await track(account, { title: 'Frontend Intern', organisation: 'Acme' });
      await page.goto('/tracker');
      // the card moves straight away and saves in the background, so wait for the save before reloading
      const saved = page.waitForResponse(
        (response) => response.request().method() === 'PATCH' && response.url().includes('/application/'),
      );

      await chooseFromCardMenu(page, 'Frontend Intern', 'Applied', () =>
        expect(stage(page, 'Applied').locator('.kanban-card')).toContainText('Frontend Intern', {
          timeout: 5000,
        }),
      );

      await expect(stage(page, 'Applied').locator('.kanban-card')).toContainText('Frontend Intern');
      await expect(stage(page, 'Saved').locator('.kanban-card')).toHaveCount(0);
      expect((await saved).ok()).toBe(true);
      await page.reload();
      await expect(stage(page, 'Applied').locator('.kanban-card')).toContainText('Frontend Intern');
    });

    test.describe('drag and drop', () => {
      test.skip(
        ({ browserName }) => browserName !== 'chromium',
        'HTML5 drag and drop is driven reliably in chromium',
      );
      // phones show one column per swipe, so Applied is off screen; cards move there with the "..." menu
      test.skip(device === 'phone', 'phones move cards with the menu, not by dragging');

      test('drags a card to Applied', async ({ loggedIn: page, account }) => {
        await track(account, { title: 'Frontend Intern', organisation: 'Acme' });
        await page.goto('/tracker');

        // the card moves straight away and saves in the background, so wait for the save before reloading
        const saved = page.waitForResponse(
          (response) => response.request().method() === 'PATCH' && response.url().includes('/application/'),
        );
        // a drag started while the board is still settling can be dropped nowhere; try again until it lands
        await expect(async () => {
          const card = stage(page, 'Saved').locator('.kanban-card', { hasText: 'Frontend Intern' });
          if (await card.count()) await card.dragTo(stage(page, 'Applied'), { timeout: 2000 });
          await expect(stage(page, 'Applied').locator('.kanban-card')).toContainText(
            'Frontend Intern',
            { timeout: 1000 },
          );
        }).toPass();
        expect((await saved).ok()).toBe(true);
        await page.reload();
        await expect(stage(page, 'Applied').locator('.kanban-card')).toContainText(
          'Frontend Intern',
        );
      });
    });

    test('exports the calendar', async ({ loggedIn: page, account }) => {
      await track(account, {
        title: 'Frontend Intern',
        organisation: 'Acme',
        deadline: new Date(Date.now() + 3 * DAY).toISOString(),
      });
      await page.goto('/tracker');
      await page.getByRole('button', { name: /Calendar$/ }).click();

      const downloading = page.waitForEvent('download');
      await page.getByRole('button', { name: /Export to Google Calendar/ }).click();
      const download = await downloading;

      expect(download.suggestedFilename()).toBe('techtrek-applications.ics');
      const text = await readFile(await download.path(), 'utf8');
      expect(text).toMatch(/^BEGIN:VCALENDAR\r\n/);
      expect(text).toContain('SUMMARY:Deadline: Frontend Intern');
    });

    test('deletes from the detail modal', async ({ loggedIn: page, account }) => {
      await track(account, { title: 'Frontend Intern', organisation: 'Acme' });
      await page.goto('/tracker');

      await page.locator('.kanban-card', { hasText: 'Frontend Intern' }).click();
      const dialog = page.getByRole('dialog', { name: 'Frontend Intern' });
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(dialog).toBeHidden();
      await expect(page.locator('.kanban-card')).toHaveCount(0);
      await page.reload();
      await expect(page.getByText('0 applications · 0 due this week')).toBeVisible();
      await expect(page.locator('.kanban-card')).toHaveCount(0);
    });
  });
}
