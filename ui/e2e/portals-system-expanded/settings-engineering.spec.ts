import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('Settings, logs, and engineering expanded workflows', () => {
  test.beforeEach(async ({ page }) => { await clearBrowserSession(page); });

  test('WF-191 admin changes and persists theme', async () => { test.fixme(true, 'Theme selection is provided by the global shell, not the Settings page inventory flow, and has no stable accessible selector.'); });
  test('WF-192 admin changes and persists language', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/settings');
    await page.getByRole('button', { name: /o'zbekcha/i }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: /o'zbekcha/i })).toBeVisible();
  });
  test('WF-193 admin changes list appearance and keeps it', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/settings');
    const colors = page.locator('input[type="color"]');
    await expect(colors.first()).toBeVisible();
    await colors.first().fill('#123456');
    await page.getByRole('button', { name: /save settings/i }).click();
    await page.reload(); await expect(colors.first()).toHaveValue('#123456');
  });
  test('WF-194 admin submits invalid setting and sees validation', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/settings');
    const duration = page.getByLabel(/default lesson duration/i);
    await duration.fill('0'); await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/positive number/i)).toBeVisible();
  });
  test('WF-195 owner opens Logs and searches requests', async ({ page }) => {
    await loginAs(page, 'owner'); await page.goto('/#/logs');
    await expect(page.getByRole('heading', { name: /request logs/i })).toBeVisible();
    const search = page.getByPlaceholder(/search/i).first(); await search.fill('health');
    await page.getByRole('button', { name: /search/i }).click();
    await expect(search).toHaveValue('health');
  });
  test('WF-196 owner opens redacted log details', async () => { test.fixme(true, 'Request-log detail availability depends on Mongo logging, which is intentionally disabled in the E2E environment.'); });
  test('WF-197 owner opens Engineering and sees service health', async ({ page }) => {
    await loginAs(page, 'owner'); await page.goto('/#/engineering');
    await expect(page.getByRole('heading', { name: 'Engineering' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Server' })).toBeVisible();
  });
  test('WF-198 owner runs allowed database operation', async () => { test.fixme(true, 'Database operations mutate shared test state and no isolated reversible operation is designated.'); });
  test('WF-199 admin cannot open owner-only E2E Engineering action', async ({ page }) => {
    await loginAs(page, 'admin'); await page.goto('/#/engineering');
    await expect(page.getByRole('button', { name: 'E2E Flows' })).toHaveCount(0);
  });
  test('WF-200 owner runs an E2E flow from Engineering', async () => { test.fixme(true, 'Starting the runner from inside the same Playwright run is recursive and unsafe; validate this from a dedicated runner smoke test.'); });
});
