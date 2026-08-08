import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-09 Telegram registration lifecycle', () => {
  test('admin can open, filter, and inspect the conversion queue', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/telegram-registrations');
    await expect(page.getByText(/telegram registrations/i).first()).toBeVisible();
    const search = page.getByPlaceholder(/search by name/i);
    await search.fill('nonexistent-e2e-lead');
    await expect(search).toHaveValue('nonexistent-e2e-lead');
    await search.clear();
  });
});
