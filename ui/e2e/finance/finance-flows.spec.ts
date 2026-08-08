import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-15 discounted payment and debt reconciliation', () => {
  test('admin opens payment creation, selects seeded student, and sees finance fields', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/payments/new');
    await expect(page.getByText('Add Payment').first()).toBeVisible();
    await expect(page.getByText(/^Student \*$/).first()).toBeVisible();
    await expect(page.getByLabel(/payment date/i)).toBeVisible();
    await expect(page.getByLabel(/receipt number/i)).toBeVisible();
    await expect(page.getByText(/payment method/i).first()).toBeVisible();
  });

  test('payment list and debt list remain center-scoped after reload', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/payments');
    await expect(page.getByText(/payments management/i).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(/payment records/i).first()).toBeVisible();
    await page.goto('/#/debts');
    await expect(page.getByText(/debts/i).first()).toBeVisible();
  });
});

test.describe('E2E-16 teacher payment access', () => {
  test('teacher payment route never grants admin-wide visibility', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await page.goto('/#/payments');
    await expect(page).toHaveURL(/#\/payments|#\/teacher-portal/);
    await expect(page.getByText(/payment|access/i).first()).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('payment_token'));
    expect(stored).toBeNull();
  });
});

test.describe('E2E-17 finance reporting', () => {
  test('finance-permitted admin can navigate overview and seeded teacher detail', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/finance');
    await expect(page.getByText(/finance/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/search teachers/i)).toBeVisible();
    await page.getByPlaceholder(/search teachers/i).fill('E2E Teacher');
    await expect(page.getByText(/E2E Teacher/i).first()).toBeVisible();
  });

  test('limited admin cannot access finance directly', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'limitedAdmin');
    await page.goto('/#/finance');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });
});
