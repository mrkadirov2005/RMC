import { expect, test } from '@playwright/test';
import { actors } from '../fixtures/actors';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('authentication and access', () => {
  test.beforeEach(async ({ page }) => clearBrowserSession(page));

  test('E2E-01 anonymous protected navigation redirects to a login page', async ({ page }) => {
    await page.goto('/#/students');
    await expect(page).toHaveURL(/#\/login\/superuser/);
  });

  test('E2E-01 invalid admin credentials show an error and retain username', async ({ page }) => {
    await page.goto('/#/login/superuser');
    await page.getByLabel('Username').fill('e2e_admin');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid username or password/i).first()).toBeVisible();
    await expect(page.getByLabel('Username')).toHaveValue('e2e_admin');
  });

  for (const actorName of ['owner', 'admin', 'teacher', 'student'] as const) {
    const flowId = actorName === 'owner' ? 'E2E-02' : actorName === 'admin' ? 'E2E-01' : 'E2E-03';
    test(`${flowId} ${actorName} logs in and reaches the correct portal`, async ({ page }) => {
      await loginAs(page, actorName);
      const actor = actors[actorName];
      await expect(page).toHaveURL(new RegExp(`#${actor.landing.replaceAll('/', '\\/')}`));
      const stored = await page.evaluate(() => ({
        token: localStorage.getItem('token') || sessionStorage.getItem('token'),
        user: localStorage.getItem('user') || sessionStorage.getItem('user'),
      }));
      expect(stored.token).toBeTruthy();
      expect(stored.user).not.toContain('password_hash');
    });
  }

  test('E2E-04 limited admin cannot open teacher management by direct URL', async ({ page }) => {
    await loginAs(page, 'limitedAdmin');
    await page.goto('/#/teachers');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });

  test('E2E-04 teacher and student cannot open admin students route', async ({ page }) => {
    for (const actor of ['teacher', 'student'] as const) {
      await clearBrowserSession(page);
      await loginAs(page, actor);
      await page.goto('/#/students');
      await expect(page).not.toHaveURL(/#\/students$/);
    }
  });

  test('E2E-01 remember-me off stores credentials in session storage only', async ({ page }) => {
    await page.goto('/#/login/superuser');
    await page.getByLabel('Username').fill(actors.admin.username);
    await page.getByLabel('Password', { exact: true }).fill(actors.admin.password);
    await page.getByRole('checkbox', { name: /remember/i }).uncheck();
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/#\/dashboard/);
    const storage = await page.evaluate(() => ({
      local: localStorage.getItem('token'),
      session: sessionStorage.getItem('token'),
    }));
    expect(storage.local).toBeNull();
    expect(storage.session).toBeTruthy();
  });
});
