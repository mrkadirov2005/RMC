import { expect, type Page } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

export async function openAsAdmin(page: Page, route: string) {
  await clearBrowserSession(page);
  await loginAs(page, 'admin');
  await page.goto(`/#${route}`);
}

export async function openSeededClass(page: Page) {
  await openAsAdmin(page, '/classes');
  await page.getByRole('button', { name: /groups|guruhlar/i }).click();
  const seededClass = page.getByText('E2E Class A').first();
  await expect(seededClass).toBeVisible();
  await seededClass.click();
  await expect(page).toHaveURL(/#\/classes\/\d+/);
}
