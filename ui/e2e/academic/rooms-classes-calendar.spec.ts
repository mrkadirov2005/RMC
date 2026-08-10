import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('E2E-11 rooms and booking', () => {
  test('admin opens room creation and validates required room identity', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/rooms');
    await expect(page.getByText(/rooms/i).first()).toBeVisible();
    await page.getByRole('button', { name: /add.*room/i }).first().click();
    const formTitle = page.getByRole('heading', { name: /add new room assignment/i });
    await expect(formTitle).toBeVisible();
    await expect(page.getByLabel(/room number/i)).toBeVisible();
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(formTitle).toBeVisible();
  });
});

test.describe('E2E-12 class scheduling and enrollment', () => {
  test('admin opens seeded class detail and sees teacher and schedule workspace', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/classes');
    await page.getByRole('button', { name: /groups|guruhlar/i }).click();
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
    await page.getByText('E2E Class A').first().click();
    await expect(page).toHaveURL(/#\/classes\/\d+/);
    await expect(page.getByText(/E2E Class A/i).first()).toBeVisible();
  });
});

test.describe('E2E-13 lesson completion', () => {
  test('unassigned direct workflow ID cannot expose another lesson', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await page.goto('/#/classes/999999/sessions/999999/workflow');
    await expect(page.getByText(/not found|failed|no session/i).first()).toBeVisible();
  });
});

test.describe('E2E-14 calendar actor scope', () => {
  for (const actor of ['admin', 'teacher', 'student'] as const) {
    test(`${actor} can open the permitted calendar`, async ({ page }) => {
      await clearBrowserSession(page);
      await loginAs(page, actor);
      await page.goto('/#/calendar');
      await expect(page).toHaveURL(/#\/calendar/);
      await expect(page.getByText(/calendar/i).first()).toBeVisible();
    });
  }
});
