import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-06 teacher management', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
  });

  test('admin creates a teacher and finds the persisted record after reload', async ({ page }) => {
    const suffix = `${Date.now()}`;
    const firstName = `Flow${suffix.slice(-6)}`;
    const username = `teacher_${suffix}`;

    await page.goto('/#/teachers');
    await page.getByRole('button', { name: 'Add Teacher' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add New Teacher' });
    await dialog.getByLabel('First Name').fill(firstName);
    await dialog.getByLabel('Last Name').fill('Playwright');
    await dialog.getByLabel('Phone').fill('+998901234567');
    await dialog.getByLabel('Date of Birth').fill('1990-01-15');
    await dialog.getByLabel('Qualification').fill('Bachelor');
    await dialog.getByLabel('Specialization').fill('English');
    await dialog.getByLabel('Teacher Share (%)').fill('55');
    await dialog.getByLabel('Username').fill(username);
    await dialog.getByLabel('Password').fill('TeacherPass123!');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(dialog).toBeHidden();
    await page.getByPlaceholder(/search teachers/i).fill(username);
    await expect(page.getByText(firstName).first()).toBeVisible();
    await page.reload();
    await page.getByPlaceholder(/search teachers/i).fill(username);
    await expect(page.getByText(firstName).first()).toBeVisible();
  });

  test('teacher form enforces required values and salary bounds', async ({ page }) => {
    await page.goto('/#/teachers');
    await page.getByRole('button', { name: 'Add Teacher' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add New Teacher' });
    await dialog.getByLabel('Teacher Share (%)').fill('101');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('First Name')).toHaveAttribute('required', '');
    await expect(dialog.getByLabel('Teacher Share (%)')).toHaveJSProperty('validity.valid', false);
  });
});
