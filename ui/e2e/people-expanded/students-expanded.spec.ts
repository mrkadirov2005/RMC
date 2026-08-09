import { expect, test, type Locator, type Page } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

const field = (form: Locator, label: string) =>
  form.locator('label', { hasText: new RegExp(`^${label}$`, 'i') }).locator('..').locator('input');

async function openStudents(page: Page) {
  await page.goto('/#/students');
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
}

async function openSeedStudent(page: Page) {
  await openStudents(page);
  await page.getByPlaceholder(/search by name/i).fill('E2E-S-001');
  await page.getByText('E2E Student', { exact: true }).first().click();
  await expect(page).toHaveURL(/#\/students\/\d+\/profile$/);
}

test.describe('expanded student workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
  });

  test('WF-041 Admin opens Students and sees the student list', async ({ page }) => {
    await openStudents(page);
    await expect(page.getByText('E2E Student', { exact: true }).first()).toBeVisible();
  });

  test('WF-042 Admin creates a valid student and sees it in Students', async ({ page }) => {
    const suffix = `${Date.now()}`;
    const firstName = `WF042${suffix.slice(-5)}`;
    await page.goto('/#/students/new');
    const form = page.locator('form');
    await field(form, 'First name').fill(firstName);
    await field(form, 'Last name').fill('Playwright');
    await field(form, 'Phone').fill('+998909876543');
    await field(form, 'Date of birth').fill('2012-05-10');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/#\/students$/);
    await page.getByPlaceholder(/search by name/i).fill(firstName);
    await expect(page.getByText(firstName, { exact: true }).first()).toBeVisible();
  });

  test('WF-043 Empty required student fields prevent submission', async ({ page }) => {
    await page.goto('/#/students/new');
    const form = page.locator('form');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/#\/students\/new$/);
    await expect(field(form, 'First name')).toHaveJSProperty('validity.valid', false);
  });

  test('WF-044 Duplicate student username is rejected', async ({ page }) => {
    await page.goto('/#/students/new');
    const form = page.locator('form');
    await field(form, 'First name').fill('Duplicate');
    await field(form, 'Last name').fill('Student');
    await field(form, 'Phone').fill('+998909876544');
    await field(form, 'Date of birth').fill('2012-05-10');
    await field(form, 'Username').fill('e2e_student');
    await field(form, 'Password').fill('E2ePass123!');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/#\/students\/new$/);
  });

  test('WF-045 Invalid class and teacher pairing is rejected', async () => {
    test.fixme(true, 'The seeded center has only one teacher/class pair, so an invalid cross-pair cannot be selected in the actual form.');
  });

  test('WF-046 Admin searches students by name', async ({ page }) => {
    await openStudents(page);
    await page.getByPlaceholder(/search by name/i).fill('E2E Student');
    await expect(page.getByText('E2E Student', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Frozen Student', { exact: true })).toHaveCount(0);
  });

  test('WF-047 Admin filters students by status', async ({ page }) => {
    await openStudents(page);
    await page.getByRole('button', { name: /filters/i }).click();
    const status = page.locator('label', { hasText: /^Status$/ }).locator('..');
    await status.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await expect(status.getByRole('combobox')).toContainText('Active');
    await expect(page.getByText('E2E Student', { exact: true }).first()).toBeVisible();
  });

  test('WF-048 Admin opens a student profile and sees saved data', async ({ page }) => {
    await openSeedStudent(page);
    await expect(page.getByText('Username: e2e_student')).toBeVisible();
    await expect(page.getByText('Group: E2E Class A')).toBeVisible();
  });

  test('WF-049 Admin edits a student and sees success', async ({ page }) => {
    await openStudents(page);
    await page.getByPlaceholder(/search by name/i).fill('E2E-S-002');
    const row = page.getByText('Frozen Student', { exact: true }).first().locator('xpath=ancestor::tr[1]');
    await row.getByRole('button', { name: 'Edit' }).click();
    const form = page.locator('form');
    await field(form, 'Phone').fill('+998900000098');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/#\/students$/);
  });

  test('WF-050 Edited student data persists after reload', async ({ page }) => {
    await openStudents(page);
    await page.getByPlaceholder(/search by name/i).fill('E2E-S-002');
    const row = page.getByText('Frozen Student', { exact: true }).first().locator('xpath=ancestor::tr[1]');
    await row.getByRole('button', { name: 'Edit' }).click();
    const form = page.locator('form');
    await field(form, 'Phone').fill('+998900000099');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByPlaceholder(/search by name/i).fill('E2E-S-002');
    await page.getByText('Frozen Student', { exact: true }).first().click();
    await expect(page.getByText('+998900000099')).toBeVisible();
    await page.reload();
    await expect(page.getByText('+998900000099')).toBeVisible();
  });

  test('WF-051 Admin transfers a student to another class', async () => {
    test.fixme(true, 'The E2E seed exposes only E2E Class A, so there is no second real class to transfer to.');
  });
  test('WF-052 Transfer to the same class shows validation', async () => {
    test.fixme(true, 'The transfer control removes the current class from its options; the UI has no same-class submission path.');
  });
  test('WF-053 Admin freezes an active student', async () => {
    test.fixme(true, 'No freeze action exists on the Students list, student form, or student profile.');
  });
  test('WF-054 Admin unfreezes a student', async () => {
    test.fixme(true, 'No unfreeze action exists on the Students list, student form, or student profile.');
  });
  test('WF-055 Admin archives a student', async () => {
    test.fixme(true, 'The current Students page labels its destructive action Delete and provides no archive-specific action/result.');
  });
  test('WF-056 Admin restores a student from Archive', async () => {
    test.fixme(true, 'The seed contains no archived student and this isolated workflow may not depend on another destructive test.');
  });
  test('WF-057 Owner permanently purges an archived student', async () => {
    test.fixme(true, 'The seed contains no disposable archived student that can be safely purged.');
  });
  test('WF-058 Admin cancels student archive', async () => {
    test.fixme(true, 'The current Students UI has a Delete confirmation, not a student archive action.');
  });
  test('WF-059 Admin changes a student discount', async () => {
    test.fixme(true, 'A persistent discount mutation needs a disposable seeded student; changing a shared login fixture would make selected flows order-dependent.');
  });
  test('WF-060 Newly created student can log in to its profile', async () => {
    test.fixme(true, 'The inventory requires a cross-role create/logout/login chain; this ID needs its own disposable credential fixture to remain independently selectable.');
  });

  test('WF-221 Admin opens the Students Statistics tab', async ({ page }) => {
    await openStudents(page);
    await page.getByRole('tab', { name: 'Statistics' }).click();
    await expect(page.getByRole('tab', { name: 'Statistics' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/total students/i).first()).toBeVisible();
  });

  test('WF-222 Admin opens grouped students on the Teachers tab', async ({ page }) => {
    await openStudents(page);
    await page.getByRole('tab', { name: 'Teachers' }).click();
    await expect(page.getByRole('tab', { name: 'Teachers' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('E2E Teacher', { exact: true }).first()).toBeVisible();
  });

  test('WF-223 Admin imports valid students CSV', async () => {
    test.fixme(true, 'Importing creates persistent records and the assigned scope cannot add a per-test database reset or disposable CSV fixture.');
  });
  test('WF-224 Invalid students CSV shows import errors', async () => {
    test.fixme(true, 'No committed invalid CSV fixture exists and this task is restricted to new spec files only.');
  });

  test('WF-225 Admin exports students CSV', async ({ page }) => {
    await openStudents(page);
    await page.getByRole('button', { name: 'More student actions' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/students.*\.csv/i);
  });

  test('WF-226 Admin pushes students to Google Sheets', async () => {
    test.fixme(true, 'Google Sheets integration credentials are not configured in the local E2E environment.');
  });
  test('WF-227 Admin pulls students from Google Sheets', async () => {
    test.fixme(true, 'Google Sheets integration credentials are not configured in the local E2E environment.');
  });
  test('WF-228 Admin bulk archives selected students', async () => {
    test.fixme(true, 'The actual bulk action is Delete, not Archive; asserting archive success would misrepresent the UI.');
  });

  test('WF-229 Admin resets a student password', async ({ page }) => {
    await openSeedStudent(page);
    await page.getByPlaceholder('Enter new password').fill('E2ePass123!');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page.getByText('Password updated successfully.')).toBeVisible();
  });

  test('WF-230 Admin changes a group teacher from Students', async () => {
    test.fixme(true, 'Only one teacher is seeded, so the grouped Students UI has no different teacher target.');
  });
});
