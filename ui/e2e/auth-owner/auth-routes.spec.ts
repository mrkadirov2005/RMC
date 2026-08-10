import { expect, test } from '@playwright/test';
import { actors } from '../fixtures/actors';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('workflow catalog: authentication and routes', () => {
  test.beforeEach(async ({ page }) => clearBrowserSession(page));

  test('WF-001 Admin valid login → show dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByText(/statistics scope/i)).toBeVisible();
  });

  test('WF-002 Admin invalid login → show error', async ({ page }) => {
    await page.goto('/#/login/superuser');
    await page.getByLabel('Username').fill(actors.admin.username);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: /^continue to/i }).click();
    await expect(page.getByText(/invalid username or password/i).first()).toBeVisible();
  });

  test('WF-003 Admin empty login form → show validation', async () => {
    test.fixme(true, 'The login form uses noValidate and currently submits empty credentials without client-side required-field feedback.');
  });

  test('WF-004 Admin login without Remember me → store session', async ({ page }) => {
    await page.goto('/#/login/superuser');
    await page.getByLabel('Username').fill(actors.admin.username);
    await page.getByLabel('Password', { exact: true }).fill(actors.admin.password);
    await page.getByRole('checkbox', { name: /remember/i }).uncheck();
    await page.getByRole('button', { name: /^continue to/i }).click();
    await expect(page).toHaveURL(/#\/dashboard/);
    expect(await page.evaluate(() => sessionStorage.getItem('token'))).toBeTruthy();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('WF-005 Admin login with Remember me → restore session after reload', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.reload();
    await expect(page).toHaveURL(/#\/dashboard/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();
  });

  for (const [id, actor] of [['006', 'owner'], ['007', 'teacher'], ['008', 'student']] as const) {
    test(`WF-${id} ${actor} valid login → show correct portal`, async ({ page }) => {
      await loginAs(page, actor);
      await expect(page).toHaveURL(new RegExp(`#${actors[actor].landing.replaceAll('/', '\\/')}`));
    });
  }

  test('WF-009 Inactive user login → show blocked-account error', async () => {
    test.fixme(true, 'The E2E seed has no inactive login actor.');
  });

  test('WF-010 Logged-in user logout → return to login', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/#\/login\/superuser/);
  });

  test('WF-011 Logged-out user → protected page redirects to login', async ({ page }) => {
    await page.goto('/#/students');
    await expect(page).toHaveURL(/#\/login\/superuser/);
  });

  test('WF-012 Admin → owner page shows access denied', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/owner/manage');
    await expect(page).toHaveURL(/#\/unauthorized/);
    await expect(page.getByText(/access denied/i)).toBeVisible();
  });

  test('WF-013 Owner → admin dashboard redirects safely', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/#/dashboard');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });

  test('WF-014 Teacher → Students is denied', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/#/students');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });

  test('WF-015 Student → Teachers is denied', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/#/teachers');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });

  test('WF-016 Limited admin → allowed page is visible', async ({ page }) => {
    await loginAs(page, 'limitedAdmin');
    await page.goto('/#/dashboard');
    await expect(page.getByText(/statistics scope/i)).toBeVisible();
  });

  test('WF-017 Limited admin → forbidden page is denied', async ({ page }) => {
    await loginAs(page, 'limitedAdmin');
    await page.goto('/#/teachers');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });

  test('WF-018 User → unknown URL redirects to correct home', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/#/not-a-real-route');
    await expect(page).toHaveURL(/#\/teacher-portal/);
  });

  test('WF-019 Expired session → request redirects to login', async () => {
    test.fixme(true, 'No deterministic expired-token fixture is provided by the E2E seed.');
  });

  test('WF-020 User → reload protected page restores correct page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/students');
    await page.reload();
    await expect(page).toHaveURL(/#\/students/);
    await expect(page.getByRole('heading', { name: /students/i }).first()).toBeVisible();
  });
});
