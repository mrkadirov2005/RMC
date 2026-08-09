import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('Archive and Telegram expanded workflows', () => {
  test.beforeEach(async ({ page }) => { await clearBrowserSession(page); });

  test('WF-181 admin opens Archive and sees archived record groups', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/archive');
    await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /students/i })).toBeVisible();
  });
  test('WF-182 admin filters Archive by record type', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/archive');
    const teachers = page.getByRole('tab', { name: /teachers/i });
    await teachers.click(); await expect(teachers).toHaveAttribute('data-state', 'active');
  });
  test('WF-183 admin searches Archive', async () => { test.fixme(true, 'Archive provides entity tabs but no search input.'); });
  test('WF-184 admin restores archived record', async () => { test.fixme(true, 'The seed does not guarantee a disposable archived record; restoring shared seed data would make selected runs order-dependent.'); });
  test('WF-185 owner purges archived record', async () => { test.fixme(true, 'Permanent deletion is destructive and no disposable archived fixture is seeded for this flow.'); });

  test('WF-186 admin opens Telegram Registrations and sees pending leads', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/telegram-registrations');
    await expect(page.getByRole('heading', { name: /telegram registrations/i })).toBeVisible();
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible();
  });
  test('WF-187 admin filters Telegram leads', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/telegram-registrations');
    const status = page.getByRole('combobox').first();
    await status.click(); await page.getByRole('option', { name: /rejected/i }).click();
    await expect(page.getByText('Rejected', { exact: true }).first()).toBeVisible();
  });
  test('WF-188 admin converts Telegram lead to student', async () => { test.fixme(true, 'No disposable pending Telegram registration is guaranteed by the E2E seed.'); });
  test('WF-189 admin cannot convert the same Telegram lead twice', async () => { test.fixme(true, 'Requires a disposable lead and a successful conversion fixture before duplicate prevention can be asserted.'); });
  test('WF-190 admin rejects Telegram lead', async () => { test.fixme(true, 'Reject mutates lead state and no disposable pending lead is seeded.'); });
});
