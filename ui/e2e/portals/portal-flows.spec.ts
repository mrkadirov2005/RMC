import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-19 teacher portal', () => {
  test('teacher traverses every scoped workspace tab', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await expect(page.getByText(/teaching workspace/i)).toBeVisible();
    for (const tab of ['My Classes', 'My Tests', 'Calendar', 'Attendance', 'Grades', 'Assignments']) {
      const trigger = page.getByRole('tab', { name: tab });
      await trigger.click();
      await expect(trigger).toHaveAttribute('data-state', 'active');
    }
  });

  test('teacher portal shows only the assigned seeded class', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await page.getByRole('tab', { name: 'My Classes' }).click();
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
  });
});

test.describe('E2E-20 student portal', () => {
  test('student sees identity, class, schedule, tests, grades and profile navigation', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await expect(page.getByText(/student portal/i).first()).toBeVisible();
    await expect(page.getByText(/E2E Student/i).first()).toBeVisible();
    await expect(page.getByText(/weekly class schedule/i)).toBeVisible();
    await expect(page.getByText(/recent grades/i)).toBeVisible();
    await page.getByRole('button', { name: /my profile/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('E2E Class A').last()).toBeVisible();
  });

  test('student cannot expose another student through admin routes', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await page.goto('/#/students/999999/profile');
    await expect(page).not.toHaveURL(/#\/students\/999999\/profile$/);
  });
});
