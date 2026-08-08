import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-10 subjects and assignments', () => {
  test('admin navigates both lifecycles and opens their create dialogs', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');

    await page.goto('/#/subjects');
    await expect(page.getByText(/subjects/i).first()).toBeVisible();
    const addSubject = page.getByRole('button', { name: /add subject/i });
    await addSubject.click();
    await expect(page.getByRole('dialog', { name: /add new subject/i })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/#/assignments');
    await expect(page.getByText(/assignments/i).first()).toBeVisible();
    const addAssignment = page.getByRole('button', { name: /add assignment/i }).first();
    await addAssignment.click();
    await expect(page.getByRole('dialog', { name: /add new assignment/i })).toBeVisible();
  });

  test('student cannot open assignment administration directly', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await page.goto('/#/assignments');
    await expect(page).not.toHaveURL(/#\/assignments$/);
  });
});
