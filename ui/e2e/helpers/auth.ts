import { expect, type Page } from '@playwright/test';
import { actors, type ActorName } from '../fixtures/actors';

export async function loginAs(page: Page, actorName: ActorName) {
  const actor = actors[actorName];
  await page.goto(`/#${actor.route}`);
  await page.getByLabel('Username').fill(actor.username);
  await page.getByLabel('Password', { exact: true }).fill(actor.password);
  await page.getByRole('button', { name: /^continue to/i }).click();
  await expect(page).toHaveURL(new RegExp(`#${actor.landing.replaceAll('/', '\\/')}(?:$|\\?)`));
}

export async function clearBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
