import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-24 service failure and recovery', () => {
  test('failed protected API leaves authentication intact and retry recovers', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    const tokenBefore = await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));

    await page.route('**/api/students**', (route) => route.abort('failed'));
    await page.goto('/#/students');
    await expect(page.getByText(/failed|unavailable|error|try again/i).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'))).toBe(tokenBefore);

    await page.unroute('**/api/students**');
    await page.reload();
    await expect(page.getByText(/students/i).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'))).toBe(tokenBefore);
  });

  test('401 clears authentication and redirects safely', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.route('**/api/students**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"expired"}' }));
    await page.goto('/#/students');
    await expect(page).toHaveURL(/#\/login\/superuser/);
  });
});
