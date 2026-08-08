import { expect, test, type Locator } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

const inputAfterLabel = (form: Locator, label: string) =>
  form.locator('label', { hasText: new RegExp(`^${label}$`, 'i') }).locator('..').locator('input');

test.describe('E2E-07 student management', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
  });

  test('admin creates a student, searches it, and verifies persistence', async ({ page }) => {
    const suffix = `${Date.now()}`;
    const username = `student_${suffix}`;
    const firstName = `Student${suffix.slice(-6)}`;

    await page.goto('/#/students/new');
    const form = page.locator('form');
    await inputAfterLabel(form, 'First name').fill(firstName);
    await inputAfterLabel(form, 'Last name').fill('Playwright');
    await inputAfterLabel(form, 'Phone').fill('+998909876543');
    await inputAfterLabel(form, 'Date of birth').fill('2012-05-10');
    await inputAfterLabel(form, 'Username').fill(username);
    await inputAfterLabel(form, 'Password').fill('StudentPass123!');

    for (const [label, option] of [['Gender', 'Male'], ['Status', 'Active'], ['Class', 'E2E Class A'], ['Teacher', 'E2E Teacher']] as const) {
      const field = form.locator('label', { hasText: new RegExp(`^${label}$`, 'i') }).locator('..');
      await field.getByRole('combobox').click();
      await page.getByRole('option', { name: option, exact: false }).click();
    }

    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/#\/students$/);
    await page.getByPlaceholder(/search by name/i).fill(username);
    await expect(page.getByText(firstName).first()).toBeVisible();
    await page.reload();
    await page.getByPlaceholder(/search by name/i).fill(username);
    await expect(page.getByText(firstName).first()).toBeVisible();
  });

  test('required student fields block an empty submission', async ({ page }) => {
    await page.goto('/#/students/new');
    const form = page.locator('form');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/#\/students\/new$/);
    await expect(inputAfterLabel(form, 'First name')).toHaveJSProperty('validity.valid', false);
  });
});
