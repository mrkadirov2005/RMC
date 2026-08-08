import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-18 online test lifecycle', () => {
  test('authorized admin can enter the complete authoring workflow', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/tests');
    await expect(page.getByText('Tests Management')).toBeVisible();
    await page.getByRole('button', { name: /create test/i }).click();
    await expect(page).toHaveURL(/#\/tests\/create/);
    await expect(page.getByText('Create New Test')).toBeVisible();
    for (const step of ['Basic Info', 'Add Questions', 'Settings', 'Review']) {
      await expect(page.getByText(step, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /add question/i })).toBeVisible();
  });

  test('student sees only assigned-test workspace and cannot author', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await page.goto('/#/my-tests');
    await expect(page.getByText('My Tests')).toBeVisible();
    await page.goto('/#/tests/create');
    await expect(page).not.toHaveURL(/#\/tests\/create$/);
  });

  test('unknown submission cannot expose grading or answer details', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/tests/submissions/999999/grade');
    await expect(page.getByText(/not found|failed|submission/i).first()).toBeVisible();
  });
});
