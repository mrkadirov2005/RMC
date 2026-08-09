import { expect, test, type Page } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

async function openTeachers(page: Page) {
  await page.goto('/#/teachers');
  await expect(page.getByRole('button', { name: 'Add Teacher' })).toBeVisible();
}

async function openSeedTeacher(page: Page) {
  await openTeachers(page);
  await page.getByPlaceholder(/search teachers/i).fill('E2E-T-001');
  await page.getByText('E2E Teacher', { exact: true }).first().click();
  await expect(page).toHaveURL(/#\/teachers\/\d+\/profile$/);
}

test.describe('expanded teacher workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
  });

  test('WF-061 Admin opens Teachers and sees the teacher list', async ({ page }) => {
    await openTeachers(page);
    await expect(page.getByText('E2E Teacher', { exact: true }).first()).toBeVisible();
  });
  test('WF-062 Admin adds a valid teacher', async () => {
    test.fixme(true, 'Teacher creation is already covered by the canonical people/teacher-create spec; this independently selectable ID needs reset isolation before duplicating that mutation.');
  });
  test('WF-063 Missing teacher fields prevent submission', async ({ page }) => {
    await openTeachers(page);
    await page.getByRole('button', { name: 'Add Teacher' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add New Teacher' });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('First Name')).toHaveJSProperty('validity.valid', false);
  });
  test('WF-064 Duplicate teacher username is rejected', async () => {
    test.fixme(true, 'A complete duplicate submission would mutate shared seeded data if backend uniqueness behavior regresses; a disposable reset fixture is required.');
  });
  test('WF-065 Admin searches teachers', async ({ page }) => {
    await openTeachers(page);
    await page.getByPlaceholder(/search teachers/i).fill('E2E-T-001');
    await expect(page.getByText('E2E Teacher', { exact: true }).first()).toBeVisible();
  });
  test('WF-066 Admin filters teachers by status', async () => {
    test.fixme(true, 'TeachersPage has search but no status filter control.');
  });
  test('WF-067 Admin opens a teacher profile', async ({ page }) => {
    await openSeedTeacher(page);
    await expect(page.getByRole('tab', { name: 'Information' })).toBeVisible();
    await expect(page.getByText('e2e_teacher', { exact: false }).first()).toBeVisible();
  });
  test('WF-068 Admin edits a teacher', async () => {
    test.fixme(true, 'A persistent edit of the sole shared teacher would alter downstream selected workflows without per-test reseeding.');
  });
  test('WF-069 Admin assigns teacher to a class', async () => {
    test.fixme(true, 'TeacherPage has no class-assignment form; assignment is managed from Classes.');
  });
  test('WF-070 Deleting a teacher with dependencies is blocked', async () => {
    test.fixme(true, 'The UI offers Delete but has no dedicated blocked-dependency message contract, and destructive probing risks the sole seeded teacher.');
  });

  test('WF-231 Admin imports valid teachers CSV', async () => {
    test.fixme(true, 'No disposable teacher CSV fixture/reset is available within the new-spec-only scope.');
  });
  test('WF-232 Invalid teachers CSV shows errors', async () => {
    test.fixme(true, 'No committed invalid teacher CSV fixture exists and this task cannot add shared fixtures.');
  });
  test('WF-233 Admin exports teachers CSV', async ({ page }) => {
    await openTeachers(page);
    await page.locator('button.h-8.w-8').first().click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/teachers.*\.csv/i);
  });
  test('WF-234 Admin bulk deletes selected teachers', async () => {
    test.fixme(true, 'The seed has only one dependency-bearing teacher and no disposable teachers for a safe bulk-delete assertion.');
  });
  test('WF-235 Admin clears selected teachers', async ({ page }) => {
    await openTeachers(page);
    await page.getByLabel('Select E2E Teacher').check();
    await expect(page.getByText('1 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByText('1 selected')).toHaveCount(0);
    await expect(page.getByLabel('Select E2E Teacher')).not.toBeChecked();
  });
  test('WF-236 Admin switches teacher list view without changing results', async ({ page }) => {
    await openTeachers(page);
    await page.locator('button.h-8.w-8').first().click();
    await page.getByRole('button', { name: 'Card view' }).click();
    await expect(page.getByText('E2E Teacher', { exact: true }).first()).toBeVisible();
  });
  test('WF-237 Admin paginates the teacher list', async () => {
    test.fixme(true, 'The E2E seed has one teacher, so the Next page control is disabled.');
  });
  test('WF-238 Admin opens teacher grades', async ({ page }) => {
    await openSeedTeacher(page);
    await page.getByRole('button', { name: 'Add Grades' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
  test('WF-239 Admin opens teacher attendance', async () => {
    test.fixme(true, 'TeacherDetailPage has no Attendance tab or scoped attendance control.');
  });
  test('WF-240 Admin opens teacher tests', async ({ page }) => {
    await openSeedTeacher(page);
    await page.getByRole('tab', { name: 'Tests' }).click();
    await expect(page.getByRole('tab', { name: 'Tests' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/teacher tests/i).first()).toBeVisible();
  });
});
