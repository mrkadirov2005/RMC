import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('Student portal expanded workflows', () => {
  test.beforeEach(async ({ page }) => { await clearBrowserSession(page); });

  test('WF-161 student logs in and sees portal overview', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText(/student portal/i).first()).toBeVisible();
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('WF-162 student opens profile and sees own data', async ({ page }) => {
    await loginAs(page, 'student');
    await page.getByRole('button', { name: /my profile/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/E2E Student/i).last()).toBeVisible();
  });

  test('WF-163 student sees own weekly schedule', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText(/weekly class schedule/i)).toBeVisible();
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
  });

  test('WF-164 student sees own attendance summary', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText('Attendance Rate')).toBeVisible();
  });

  test('WF-165 student sees own grades', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText('Average Grade')).toBeVisible();
    await expect(page.getByText('Recent Grades')).toBeVisible();
  });

  test('WF-166 student sees own coin balance', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText('Coins', { exact: true })).toBeVisible();
    await expect(page.getByText('Current balance')).toBeVisible();
  });

  test('WF-167 student sees own payment history', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText(/payment history/i)).toBeVisible();
  });

  test('WF-168 student sees own outstanding debt', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText('Outstanding Debt')).toBeVisible();
    await expect(page.getByText('Remaining balance')).toBeVisible();
  });

  test('WF-169 student sees own assignments', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByText('Assignments Due Soon')).toBeVisible();
  });

  test('WF-170 frozen student write action is blocked', async () => {
    test.fixme(true, 'The student portal currently exposes no student write action to exercise the frozen-account guard.');
  });
});
