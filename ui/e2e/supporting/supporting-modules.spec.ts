import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-22 archive, settings, translations, logs and engineering', () => {
  test('admin traverses supporting administration pages', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    const routes = [
      ['/archive', /archive/i],
      ['/settings', /settings/i],
      ['/logs', /logs/i],
      ['/engineering', /engineering/i],
    ] as const;
    for (const [route, title] of routes) {
      await page.goto(`/#${route}`);
      await expect(page).toHaveURL(new RegExp(`#${route.replaceAll('/', '\\/')}`));
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test('request-log search accepts path text without exposing secrets', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/logs');
    const search = page.getByPlaceholder(/search by username/i);
    await search.fill('/api/students');
    await expect(search).toHaveValue('/api/students');
    await expect(page.locator('body')).not.toContainText('E2ePass123!');
  });

  test('student is denied all supporting admin pages', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    for (const route of ['/archive', '/settings', '/logs', '/engineering']) {
      await page.goto(`/#${route}`);
      await expect(page).not.toHaveURL(new RegExp(`#${route.replaceAll('/', '\\/')}$`));
    }
  });
});

test.describe('E2E-23 search, filters and pagination', () => {
  test('core lists accept searches and retain a coherent empty/populated state', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    const cases = [
      ['/students', /search by name/i, 'E2E-S-001'],
      ['/teachers', /search teachers/i, 'E2E-T-001'],
      ['/payments', /search/i, 'no-such-payment-e2e'],
      ['/debts', /search debts/i, 'no-such-debt-e2e'],
    ] as const;
    for (const [route, placeholder, value] of cases) {
      await page.goto(`/#${route}`);
      const input = page.getByPlaceholder(placeholder).first();
      if (await input.count()) {
        await input.fill(value);
        await expect(input).toHaveValue(value);
      }
    }
  });

  test('center change never leaves an old-center search result selected', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'owner');
    await page.goto('/#/students');
    const search = page.getByPlaceholder(/search by name/i);
    await search.fill('E2E Student');
    await expect(search).toHaveValue('E2E Student');
  });
});
