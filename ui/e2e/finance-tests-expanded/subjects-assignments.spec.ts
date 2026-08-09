import { expect, test, openAs, unavailable } from './helpers';

test('WF-121 open Subjects and show subject list', async ({ page }) => {
  await openAs(page, 'admin', '/subjects');
  await expect(page.getByRole('heading', { name: /subjects management/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search subjects by name/i)).toBeVisible();
});

test('WF-122 open valid subject creation form', async ({ page }) => {
  await openAs(page, 'admin', '/subjects');
  await page.getByRole('button', { name: /add subject/i }).click();
  await expect(page.getByRole('dialog', { name: /add new subject/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
});

unavailable(123, 'add duplicate subject and show error', 'The seed has no contractually stable duplicate subject payload for an isolated selected run.');
unavailable(124, 'edit subject and show success', 'No disposable subject fixture is reserved for mutation by this selected flow.');
unavailable(125, 'delete unused subject', 'No disposable unused subject fixture is reserved for destructive deletion.');

test('WF-126 open Assignments and show assignment list', async ({ page }) => {
  await openAs(page, 'admin', '/assignments');
  await expect(page.getByRole('heading', { name: /vazifalarni boshqarish/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /add assignment/i })).toBeVisible();
});

test('WF-127 open class assignment creation form', async ({ page }) => {
  await openAs(page, 'admin', '/assignments');
  await page.getByRole('button', { name: /add assignment/i }).click();
  await expect(page.getByRole('dialog', { name: /add new assignment/i })).toBeVisible();
});

unavailable(128, 'add student assignment and show success', 'The current admin assignment form/seed does not expose a stable disposable student-specific target.');
unavailable(129, 'edit assignment and show success', 'No disposable assignment fixture is reserved for mutation by this selected flow.');
unavailable(130, 'delete assignment and remove it', 'No disposable assignment fixture is reserved for destructive deletion.');
