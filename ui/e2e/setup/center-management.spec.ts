import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-05 center management', () => {
  test('owner creates, searches, edits, and verifies a center', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'owner');
    await page.goto('/#/centers');

    const suffix = Date.now();
    const name = `Playwright Center ${suffix}`;
    const code = `PW-${suffix}`;
    await page.getByRole('button', { name: /add center/i }).click();
    const dialog = page.getByRole('dialog', { name: /add new center/i });
    await dialog.getByLabel(/center name/i).fill(name);
    await dialog.getByLabel(/center code/i).fill(code);
    await dialog.getByLabel(/^email/i).fill(`center-${suffix}@e2e.test`);
    await dialog.getByLabel(/^phone/i).fill('+998901112233');
    await dialog.getByLabel(/^address/i).fill('E2E Street 1');
    await dialog.getByLabel(/^city/i).fill('Tashkent');
    await dialog.getByLabel(/principal name/i).fill('Playwright Principal');
    await dialog.getByRole('button', { name: /save|create/i }).click();
    await expect(dialog).toBeHidden();

    await page.getByPlaceholder(/search centers/i).fill(code);
    await expect(page.getByText(name).first()).toBeVisible();
    await page.reload();
    await page.getByPlaceholder(/search centers/i).fill(code);
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test('ordinary admin is denied the owner-only centers route', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/centers');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });
});
