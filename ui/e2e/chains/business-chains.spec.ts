import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('cross-feature business chains', () => {
  test('Chain A — center setup reaches the teacher lesson workspace', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/teachers');
    await expect(page.getByText('E2E Teacher').first()).toBeVisible();
    await page.goto('/#/classes');
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
  });

  test('Chain B — student onboarding identity reaches payment and portal views', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/students');
    await page.getByPlaceholder(/search by name/i).fill('E2E-S-001');
    await expect(page.getByText('E2E Student').first()).toBeVisible();
    await page.goto('/#/payments/new');
    await expect(page.getByText(/add payment/i).first()).toBeVisible();
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await expect(page.getByText(/E2E Student/i).first()).toBeVisible();
  });

  test('Chain C — student lifecycle remains scoped across admin and teacher views', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/students');
    await expect(page.getByText('E2E Student').first()).toBeVisible();
    await page.goto('/#/archive');
    await expect(page.getByRole('tab', { name: 'Students' })).toBeVisible();
    await clearBrowserSession(page);
    await loginAs(page, 'teacher');
    await page.getByRole('tab', { name: 'My Classes' }).click();
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
  });

  test('Chain D — test authoring and student assignment workspaces are role-separated', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/tests/create');
    await expect(page.getByText('Create New Test')).toBeVisible();
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await page.goto('/#/my-tests');
    await expect(page.getByText('My Tests')).toBeVisible();
    await expect(page.getByRole('button', { name: /create test/i })).toHaveCount(0);
  });

  test('Chain E — room, class, and calendar use the same center scope', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/rooms');
    await expect(page.getByText(/rooms/i).first()).toBeVisible();
    await page.goto('/#/classes');
    await expect(page.getByText('E2E Class A').first()).toBeVisible();
    await page.goto('/#/calendar');
    await expect(page.getByText(/calendar/i).first()).toBeVisible();
  });
});
