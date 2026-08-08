import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-21 owner reports and retention', () => {
  test('owner traverses every report section with center-scoped summary cards', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'owner');
    await page.goto('/#/owner/reports?section=finance');
    for (const section of ['finance', 'students', 'teachers', 'discounts', 'retention', 'attendance']) {
      await page.goto(`/#/owner/reports?section=${section}`);
      await expect(page).toHaveURL(new RegExp(`section=${section}`));
      await expect(page.getByText(/students/i).first()).toBeVisible();
      await expect(page.getByText(/teachers/i).first()).toBeVisible();
    }
  });

  test('admin retention and intake query views survive reload', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    for (const view of ['retention', 'intake']) {
      await page.goto(`/#/retention?view=${view}`);
      await expect(page).toHaveURL(new RegExp(`view=${view}`));
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`view=${view}`));
    }
  });
});
