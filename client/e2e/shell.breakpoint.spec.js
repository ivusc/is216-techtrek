import { PHONE, WIDTHS, expect, test } from './fixtures.js';

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

test.describe('sidebar profile footer', () => {
  async function sidebarRightEdge(page) {
    const sidebar = await page.locator('#sidebar').boundingBox();
    return sidebar.x + sidebar.width;
  }

  async function rightEdge(locator) {
    const box = await locator.boundingBox();
    return box.x + box.width;
  }

  for (const width of [992, 1200, 1440]) {
    test(`${width} keeps a long name and email inside the open sidebar`, async ({
      loggedIn: page,
      account,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/home');
      const footer = page.locator('#profile');
      const name = footer.locator('strong');
      const email = footer.getByText(account.userName);
      await expect(page.locator('#sidebar')).toHaveCSS('width', '260px');

      const edge = await sidebarRightEdge(page);
      expect(await rightEdge(name)).toBeLessThanOrEqual(edge);
      expect(await rightEdge(email)).toBeLessThanOrEqual(edge);
      await expect(name).toHaveAttribute('title', await name.innerText());
      await expect(email).toHaveAttribute('title', account.userName);
    });
  }

  test('768 keeps the collapsed profile button inside the sidebar', async ({ loggedIn: page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/home');
    await expect(page.locator('#sidebar')).toHaveCSS('width', '80px');

    expect(await rightEdge(page.locator('#profile'))).toBeLessThanOrEqual(
      await sidebarRightEdge(page),
    );
  });
});

test.describe('bottom tab bar', () => {
  for (const width of WIDTHS.filter((candidate) => candidate < 768)) {
    test(`${width} fits five equal tabs with one-line labels`, async ({ loggedIn: page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/home');
      const links = page.locator('.bottom-nav .bottom-nav-link');
      await expect(links).toHaveCount(5);

      const tabs = await links.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            width: box.width,
            height: box.height,
            clipped: element.scrollWidth > element.clientWidth,
          };
        }),
      );
      for (const tab of tabs) {
        expect(tab.left).toBeGreaterThanOrEqual(0);
        expect(tab.right).toBeLessThanOrEqual(width + 0.5);
        expect(tab.clipped).toBe(false);
        expect(Math.abs(tab.width - tabs[0].width)).toBeLessThanOrEqual(1);
        expect(tab.height).toBe(tabs[0].height);
      }
    });
  }
});
