import { expect, test, type Page } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

const monthInput = (page: Page) => page.locator('input[type="month"]').first();
const dailyTab = (page: Page) => page.getByRole('button', { name: 'Kunlik' });
const statsTab = (page: Page) => page.getByRole('button', { name: 'Statistika' });
const teachersTab = (page: Page) => page.getByRole('button', { name: "O'qituvchilar" }).first();

// The seeded finance data varies, so every daily assertion accepts either a populated
// table or the empty state, the way the other finance specs treat variable data.
async function expectDailyList(page: Page) {
  await expect(page.getByText('Kunlik tushum')).toBeVisible();
  await expect(page.getByText(/kun tushum bilan/)).toBeVisible();
  const table = page.getByRole('table');
  const emptyState = page.getByText(/tolov topilmadi/i);
  await expect(table.or(emptyState).first()).toBeVisible();
}

async function openOwnerFinance(page: Page) {
  await clearBrowserSession(page);
  await loginAs(page, 'owner');
  await page.goto('/#/owner/reports?section=finance');
  await expect(monthInput(page)).toBeVisible();
}

test.describe('Owner finance daily income tab', () => {
  test('finance panel exposes the statistics, teachers and daily tabs', async ({ page }) => {
    await openOwnerFinance(page);

    await expect(statsTab(page)).toBeVisible();
    await expect(teachersTab(page)).toBeVisible();
    await expect(dailyTab(page)).toBeVisible();
  });

  test('owner opens the daily tab and sees the daily income list or its empty state', async ({ page }) => {
    await openOwnerFinance(page);
    await dailyTab(page).click();

    await expectDailyList(page);
    await expect(page.getByText(/Umumiy oylik to'lov statistikasi/)).toHaveCount(0);
  });

  test('daily tab hides the teachers-only summary cards', async ({ page }) => {
    await openOwnerFinance(page);
    await dailyTab(page).click();

    await expect(page.getByText('Kunlik tushum')).toBeVisible();
    await expect(page.getByText('Jami tolov')).toHaveCount(0);
    await expect(page.getByText('Maosh 20%')).toHaveCount(0);
  });

  test('changing the month refreshes the daily list', async ({ page }) => {
    await openOwnerFinance(page);
    await dailyTab(page).click();
    await expectDailyList(page);

    await monthInput(page).fill('2020-01');
    await expect(monthInput(page)).toHaveValue('2020-01');
    // No seeded payment predates the fixtures, so a long-past month is always empty.
    await expect(page.getByText(/tolov topilmadi/i)).toBeVisible();
    await expect(page.getByText('0 kun tushum bilan')).toBeVisible();

    await monthInput(page).fill('2026-08');
    await expect(monthInput(page)).toHaveValue('2026-08');
    await expectDailyList(page);
  });

  test('switching back to Statistika restores the statistics view', async ({ page }) => {
    await openOwnerFinance(page);
    await dailyTab(page).click();
    await expect(page.getByText('Kunlik tushum')).toBeVisible();

    await statsTab(page).click();
    await expect(page.getByText('Kunlik tushum')).toHaveCount(0);
    await expect(page.getByText(/Umumiy oylik to'lov statistikasi/)).toBeVisible();
  });
});
