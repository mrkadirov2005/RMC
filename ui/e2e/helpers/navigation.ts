import { expect, type Page } from '@playwright/test';

export async function openHashRoute(page: Page, route: string, visibleText: string | RegExp) {
  await page.goto(`/#${route}`);
  await expect(page).toHaveURL(new RegExp(`#${route.replaceAll('/', '\\/')}(?:$|\\?)`));
  await expect(page.getByText(visibleText).first()).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
}
