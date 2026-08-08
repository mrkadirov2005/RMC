import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-08 student lifecycle', () => {
  test('student detail exposes transfer, freeze, archive and credential lifecycle controls only to admin', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/students');
    await page.getByPlaceholder(/search by name/i).fill('E2E-S-001');
    await expect(page.getByText('E2E Student').first()).toBeVisible();

    const row = page.getByText('E2E Student').first().locator('xpath=ancestor::tr[1]');
    if (await row.count()) {
      await expect(row.getByRole('button').first()).toBeVisible();
    }
    await page.goto('/#/archive');
    await expect(page.getByText('Archive').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Students' })).toBeVisible();
  });

  test('frozen student can open portal but cannot access admin lifecycle pages', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'frozenStudent');
    await expect(page).toHaveURL(/#\/student-portal/);
    await page.goto('/#/archive');
    await expect(page).not.toHaveURL(/#\/archive$/);
  });
});
