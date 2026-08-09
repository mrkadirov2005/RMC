import { expect, test, openAs, unavailable } from './helpers';

test('WF-151 teacher logs in and sees portal overview', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await expect(page.getByText(/welcome back/i).first()).toBeVisible();
  await expect(page.getByText(/teaching workspace/i)).toBeVisible();
});

test('WF-152 teacher opens Classes tab', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /my classes/i }).click();
  await expect(page.getByPlaceholder(/search classes by name/i)).toBeVisible();
});

unavailable(153, 'teacher opens Students tab', 'TeacherPortal has no standalone Students tab; students are nested inside class details.');
unavailable(154, 'teacher searches own students', 'TeacherPortal has no standalone student-directory search control.');

test('WF-155 teacher opens Attendance tab', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /^attendance$/i }).click();
  await expect(page.getByText(/attendance/i).first()).toBeVisible();
});

test('WF-156 teacher opens Grades tab', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /^grades$/i }).click();
  await expect(page.getByPlaceholder(/search students/i)).toBeVisible();
});

test('WF-157 teacher opens Assignments tab', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /^assignments$/i }).click();
  await expect(page.getByText(/manage assignments/i)).toBeVisible();
});

test('WF-158 teacher opens Tests tab', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /my tests/i }).click();
  await expect(page.getByRole('heading', { name: /tests management/i })).toBeVisible();
});

unavailable(159, 'teacher opens Payments tab while locked', 'TeacherPortal does not render a Payments tab or payment unlock form.');
unavailable(160, 'teacher enters payment password', 'TeacherPortal does not implement a payment-password unlock workflow.');

unavailable(251, 'import valid payments CSV', 'No committed valid disposable payment CSV fixture exists for an isolated import mutation.');
unavailable(252, 'import invalid payments CSV', 'No committed invalid payment CSV fixture and stable row-error contract exist.');

test('WF-253 export payments CSV', async ({ page }) => {
  await openAs(page, 'admin', '/payments');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export csv/i }).click();
  const download = await downloadPromise;
  expect(await download.suggestedFilename()).toMatch(/payments.*\.csv/i);
});

test('WF-254 open payment folder', async ({ page }) => {
  await openAs(page, 'admin', '/payments');
  await page.getByPlaceholder(/search classes by name/i).fill('E2E');
  const folder = page.locator('[class*="cursor-pointer"]').filter({ hasText: /E2E/i }).first();
  await expect(folder).toBeVisible();
  await folder.click();
  await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();
});

test('WF-255 return from payment folder', async ({ page }) => {
  await openAs(page, 'admin', '/payments');
  await page.getByPlaceholder(/search classes by name/i).fill('E2E');
  await page.locator('[class*="cursor-pointer"]').filter({ hasText: /E2E/i }).first().click();
  await page.getByRole('button', { name: /back/i }).click();
  await expect(page.getByRole('heading', { name: 'Payments Management' })).toBeVisible();
  await expect(page.getByRole('button', { name: /by classes/i })).toBeVisible();
});

test('WF-256 open manual debt form', async ({ page }) => {
  await openAs(page, 'admin', '/debts');
  await page.getByRole('button', { name: /add debt/i }).click();
  await expect(page.getByRole('dialog', { name: /add new debt/i })).toBeVisible();
  await expect(page.getByText(/debt amount/i).first()).toBeVisible();
});

unavailable(257, 'edit debt and show success', 'No disposable debt fixture is reserved for mutation.');
unavailable(258, 'delete debt and remove it', 'No disposable debt fixture is reserved for destructive deletion.');

test('WF-259 analyze unpaid students', async ({ page }) => {
  await openAs(page, 'admin', '/debts');
  await page.getByRole('button', { name: /analyze unpaid months/i }).click();
  await expect(page.getByText(/students analyzed|failed to analyze payments/i).first()).toBeVisible();
});

unavailable(260, 'select candidates and generate debts', 'Candidate availability depends on current payment history and generation is destructive; no disposable candidate fixture is reserved.');
