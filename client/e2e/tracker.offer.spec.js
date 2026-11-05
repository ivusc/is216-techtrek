import process from 'node:process';
import {
  DESKTOP,
  PHONE,
  WIDTHS,
  chooseFromCardMenu,
  test as base,
  expect,
  expectGutters,
  expectInside,
  expectNoHorizontalOverflow,
  registerAccount,
  screenshot,
} from './fixtures.js';

const SM = 576;
const MD = 768;
const ROLE = { organisation: 'Grab', title: 'Software Engineer Intern' };

const test = base.extend({
  senior: async ({ playwright }, use, testInfo) => {
    const senior = await registerAccount(playwright, `e2e.senior.w${testInfo.workerIndex}`);
    await use(senior);
    await senior.dispose();
  },
  junior: async ({ browser, playwright }, use, testInfo) => {
    const junior = await registerAccount(playwright, `e2e.junior.w${testInfo.workerIndex}`);
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const page = await context.newPage();
    const response = await page.request.post(`${process.env.API_URL}/login`, {
      data: { userName: junior.userName, password: junior.password },
    });
    expect(response.status()).toBe(200);
    await use({ ...junior, page });
    await context.close();
    await junior.dispose();
  },
});

async function track(account, { organisation, title }, status) {
  const response = await account.api.post('/application', {
    data: { opportunity: { source: 'manual', type: 'internship', title, organisation }, status },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function shareTips(account, role, review) {
  const application = await track(account, role, 'offer');
  const response = await account.api.post(`/application/${application._id}/review`, {
    data: review,
  });
  expect(response.status()).toBe(201);
}

function stage(page, label) {
  return page.getByRole('region', { name: label, exact: true });
}

function congratulations(page) {
  return page.getByRole('dialog', { name: 'Congratulations on your offer from Grab!' });
}

function tipsForm(page) {
  return page.getByRole('dialog', { name: 'Share your interview tips' });
}

function moveToOffer(page, title) {
  return chooseFromCardMenu(page, title, 'Offer', () =>
    expect(congratulations(page)).toBeVisible({ timeout: 5000 }),
  );
}

async function fillTips(form, tips) {
  await form.locator('label', { hasText: '4 · Hard' }).click();
  await expect(form.getByRole('radio', { name: '4 · Hard' })).toBeChecked();
  await form.getByLabel('What were the rounds?').fill('Online assessment, then two interviews');
  await form.getByLabel('Your tips').fill(tips);
  await form.getByRole('button', { name: 'Share tips' }).click();
  await expect(form).toBeHidden();
}

test.describe('sharing interview tips after an offer', () => {
  test.describe('drag and drop', () => {
    test.skip(
      ({ browserName }) => browserName !== 'chromium',
      'HTML5 drag and drop is driven reliably in chromium',
    );

    test('desktop drags a card to Offer and shares tips straight away', async ({
      loggedIn: page,
      account,
    }) => {
      await track(account, ROLE, 'interview');
      await page.setViewportSize(DESKTOP);
      await page.goto('/tracker');

      await stage(page, 'Interview')
        .locator('.kanban-card', { hasText: ROLE.title })
        .dragTo(stage(page, 'Offer'));

      await expect(congratulations(page)).toBeVisible();
      await congratulations(page)
        .getByRole('button', { name: 'Share your interview tips' })
        .click();
      await fillTips(tipsForm(page), 'Explain trade-offs out loud.');

      await stage(page, 'Offer').locator('.kanban-card', { hasText: ROLE.title }).click();
      await expect(page.getByRole('dialog', { name: ROLE.title })).toContainText(
        'Shared on',
      );
    });
  });

  test('phone moves a card to Offer, shares tips later and a junior reads them', async ({
    loggedIn: page,
    account,
    junior,
  }, testInfo) => {
    const tips = `Revise graphs and talk through your thinking (w${testInfo.workerIndex}.${Date.now()}).`;
    await track(account, ROLE, 'interview');
    await track(junior, { organisation: 'grab', title: 'software engineer intern' }, 'applied');
    await page.setViewportSize(PHONE);
    await page.goto('/tracker');

    await moveToOffer(page, ROLE.title);
    await expect(congratulations(page)).toBeVisible();
    await congratulations(page).getByRole('button', { name: 'Maybe later' }).click();
    await expect(congratulations(page)).toBeHidden();

    await stage(page, 'Offer').locator('.kanban-card', { hasText: ROLE.title }).click();
    await page
      .getByRole('dialog', { name: ROLE.title })
      .getByRole('button', { name: 'Share your interview tips' })
      .click();
    await fillTips(tipsForm(page), tips);

    await junior.page.setViewportSize(PHONE);
    await junior.page.goto('/interview');
    await junior.page.getByRole('tab', { name: /Senior tips/ }).click();
    const section = junior.page.getByRole('tabpanel', { name: 'Senior tips' });
    const tip = section.getByRole('listitem').filter({ hasText: tips });
    await expect(tip).toContainText('Grab · Software Engineer Intern');
    await expect(tip).toContainText('Difficulty 4/5 · Hard');
    await expect(tip).toContainText('An SMU senior');
  });
});

test.describe('offer modal', () => {
  for (const width of WIDTHS) {
    const gutter = width < SM ? 8 : 16;

    test(`${width} fits the congratulations and the tips form`, async ({
      loggedIn: page,
      account,
    }, testInfo) => {
      await track(account, ROLE, 'interview');
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/tracker');
      await moveToOffer(page, ROLE.title);

      const congrats = congratulations(page);
      await expect(congrats).toBeVisible();
      await screenshot(page, testInfo, `tracker-offer-celebration-${width}`);
      await expectNoHorizontalOverflow(page);
      await expectGutters(congrats.locator('.modal-content'), width, gutter);
      const share = congrats.getByRole('button', { name: 'Share your interview tips' });
      await expect(share).toBeInViewport({ ratio: 1 });
      await expectInside(share, congrats.locator('.modal-content'));
      await share.click();

      const form = tipsForm(page);
      await expect(form).toBeVisible();
      await screenshot(page, testInfo, `tracker-offer-form-${width}`);
      await expectNoHorizontalOverflow(page);
      await expectGutters(form.locator('.modal-content'), width, gutter);
      await expectInside(form.getByRole('radiogroup'), form.locator('.modal-body'));
      const submit = form.getByRole('button', { name: 'Share tips' });
      await expect(submit).toBeInViewport({ ratio: 1 });
      await expectInside(submit, form.locator('.modal-content'));

      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();
    });
  }
});

test.describe('senior tips on interview prep', () => {
  for (const width of WIDTHS) {
    test(`${width} keeps every tip inside the page`, async ({
      loggedIn: page,
      account,
      senior,
    }, testInfo) => {
      const role = { organisation: 'Shopee', title: 'Product Analyst Intern' };
      const longTips =
        'The SQL test was window functions and joins in 45 minutes. In the case round they cared more about how you framed the problem than the final number, so say your assumptions out loud before you calculate anything.';
      await shareTips(senior, role, {
        difficulty: 4,
        rounds: 'SQL test, case interview, then a chat with the hiring manager',
        tips: longTips,
      });
      await shareTips(
        senior,
        { ...role, organisation: 'Sea' },
        { difficulty: 2, tips: 'Know your CV.' },
      );
      await track(account, role, 'applied');
      await track(account, { ...role, organisation: 'Sea' }, 'interview');
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/interview');
      await page.getByRole('tab', { name: /Senior tips/ }).click();

      const section = page.getByRole('tabpanel', { name: 'Senior tips' });
      const tip = section.getByRole('listitem').filter({ hasText: longTips }).first();
      await expect(tip).toBeVisible();
      await expect(
        section.getByRole('listitem').filter({ hasText: 'Know your CV.' }),
      ).not.toHaveCount(0);
      await section.scrollIntoViewIfNeeded();
      await screenshot(page, testInfo, `interview-senior-tips-${width}`);
      await expectNoHorizontalOverflow(page);
      await expectInside(section, page.locator('main'));

      const heading = await tip.getByRole('heading').boundingBox();
      const badge = await tip.locator('.badge').boundingBox();
      expect(badge.y < heading.y + heading.height).toBe(width >= MD);
      await expectInside(tip.locator('.badge'), tip);
    });
  }
});
