import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('mobile portal smoke', () => {
  test('student portal loads without horizontal document overflow', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'student');
    await expect(page.locator('body')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  });
});
