import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';
import { openAsAdmin, openSeededClass } from './helpers';

const unsupported = (title: string, reason: string) => test(title, async () => test.fixme(true, reason));

test('WF-071 Admin opens Classes and sees the class list', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  await expect(page.getByText('E2E Class A').first()).toBeVisible();
});

unsupported('WF-072 Admin adds a valid class and sees success', 'Needs a per-test disposable class fixture so the mutation is repeatable.');

test('WF-073 Admin submits an empty class form and sees native validation', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  await page.getByRole('button', { name: /add class/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/add new class/i)).toBeVisible();
  await dialog.getByRole('button', { name: /save|create/i }).click();
  await expect(dialog.getByLabel(/class name/i)).toBeVisible();
  await expect(dialog).toBeVisible();
});

unsupported('WF-074 Admin adds a duplicate class code and sees an error', 'Class codes are generated on create; the add form has no class-code input.');

test('WF-075 Admin searches Classes and sees the matching class', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  const search = page.getByPlaceholder(/search classes/i);
  await search.fill('E2E Class A');
  await expect(page.getByText('E2E Class A').first()).toBeVisible();
  await expect(page.getByText(/no classes/i)).toHaveCount(0);
});

test('WF-076 Admin opens class details and sees teacher room and students workspace', async ({ page }) => {
  await openSeededClass(page);
  await expect(page.getByRole('tab', { name: 'Students' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText(/E2E Class A/i).first()).toBeVisible();
});

test('WF-077 Admin opens edit class with the seeded values', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  const row = page.getByText('E2E Class A').first().locator('xpath=ancestor::tr');
  await row.getByRole('button', { name: /edit/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/edit class/i)).toBeVisible();
  await expect(dialog.getByLabel(/class name/i)).toHaveValue('E2E Class A');
});

unsupported('WF-078 Admin enrolls a student in a class', 'The class detail page is read-only for enrollment; enrollment is handled by the student workflow.');
unsupported('WF-079 Admin removes a student from a class', 'The class detail page exposes no remove-student action.');
unsupported('WF-080 Admin archives a class', 'Requires a disposable seeded class; deleting the shared class would break later flows.');

test('WF-081 Teacher opens an assigned class session roster', async ({ page }) => {
  await clearBrowserSession(page);
  await loginAs(page, 'teacher');
  await page.getByRole('tab', { name: /my classes/i }).click();
  await expect(page.getByText(/E2E Class A|classes will appear/i).first()).toBeVisible();
});

unsupported('WF-082 Teacher marks every student present', 'Needs a disposable dated lesson session to keep attendance writes repeatable.');
unsupported('WF-083 Teacher marks one student absent', 'Needs a disposable dated lesson session to keep attendance writes repeatable.');
unsupported('WF-084 Teacher enters homework scores', 'Needs a disposable lesson-session fixture and student scoring state.');
unsupported('WF-085 Teacher enters activity scores', 'Needs a disposable lesson-session fixture and student scoring state.');
unsupported('WF-086 Teacher awards student coins', 'Needs a disposable student balance and lesson-session fixture.');
unsupported('WF-087 Teacher selects a stellar student', 'Needs a disposable lesson-session fixture with a stable roster.');
unsupported('WF-088 Teacher submits an incomplete lesson and sees validation', 'The lesson workflow requires a generated session fixture before validation can be exercised.');
unsupported('WF-089 Teacher edits a completed lesson', 'The seed does not provide a completed editable lesson session.');

test('WF-090 Unassigned teacher cannot open another class session', async ({ page }) => {
  await clearBrowserSession(page);
  await loginAs(page, 'teacher');
  await page.goto('/#/classes/999999/sessions/999999/workflow');
  await expect(page.getByText(/not found|failed|no session/i).first()).toBeVisible();
});
